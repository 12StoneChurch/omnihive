import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { Knex } from "knex";
import { serializeError } from "serialize-error";

import { EngagementModel } from "./../lib/models/Engagement";

// import { EngagementModel } from "../lib/models/Engagement";
// import { countQueryBuilder } from "../queries/countQueryBuilder";

interface Args {
    engagementId: number;
}

export default class GetEngagementById extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<{}> => {
        try {
            if (!customArgs?.engagementId) {
                throw new Error("GetAllEngagements requires a customArg of engagementId");
            }
            // Get the connection to the database
            const worker = await this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");

            // Set connection as Knex
            const connection = worker?.connection as Knex;

            // PAGE ARGS
            const { engagementId } = customArgs;

            // GET TOTAL ENGAGEMENTS COUNT
            const engagementQuery = engagementQueryBuilder(connection, engagementId);
            const res = await worker?.executeQuery(engagementQuery.toString());

            const data = res && res[0][0];

            const engagement: EngagementModel = {
                engagementId: data.Engagement_ID,
                description: data.Description,
                dateCreated: data.Date_Created,
                contact: {
                    contactId: data.Contact_ID,
                    firstName: data.Contact_First_Name,
                    lastName: data.Contact_Last_Name,
                },
                owner: {
                    contactId: data.Owner_Contact_ID,
                    firstName: data.Owner_First_Name,
                    lastName: data.Owner_Last_Name,
                },
                campus: {
                    id: data.Campus_ID,
                    name: data.Campus,
                },
                type: {
                    id: data.Engagement_Type_ID,
                    name: data.Type,
                },
                status: {
                    id: data.Engagement_Status_ID,
                    name: data.Status,
                },
            };

            return engagement;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

const engagementQueryBuilder = (connection: Knex, engagementId: number) => {
    const builder = connection.queryBuilder();

    builder
        .select(
            "e.Engagement_ID",
            "e.Description",
            "e.Date_Created",
            "e.Contact_ID",
            "c.First_Name as Contact_First_Name",
            "c.Last_Name as Contact_Last_Name",
            "e.Owner_Contact_ID",
            "c2.First_Name as Owner_First_Name",
            "c2.Last_Name as Owner_Last_Name",
            "e.Congregation_ID as Campus_ID",
            "cong.Congregation_Name as Campus",
            "e.Engagement_Type_ID",
            "et.Name as Type",
            "e.Engagement_Status_ID",
            "es.Name as Status"
        )
        .from({ e: "Engagements" })
        .innerJoin("contacts as c", "c.Contact_ID", "e.Contact_ID")
        .innerJoin("contacts as c2", "c2.Contact_ID", "e.Owner_Contact_ID")
        .innerJoin("congregations as cong", "cong.Congregation_ID", "e.Congregation_ID")
        .innerJoin("Engagement_Types as et", "et.Engagement_Type_ID", "e.Engagement_Type_ID")
        .innerJoin("Engagement_Statuses as es", "es.Engagement_Status_ID", "e.Engagement_Status_ID")
        .where({ Engagement_ID: engagementId });

    return builder;
};
