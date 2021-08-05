import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { Knex } from "knex";
import { serializeError } from "serialize-error";

import { EngagementModel } from "./../lib/models/Engagement";
import { getEngagementByIdQuery } from '../queries/getEngagementById';

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

            // GET HISTORY
            const contactLogHistory = await getContactLogCount(connection, engagementId);
            const engagementLogHistory = await getEngagementLogCount(connection, engagementId);

            // GET TOTAL ENGAGEMENTS COUNT
            const engagementQuery = getEngagementByIdQuery(connection, engagementId);
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
                history: {
                    contactLogCount: contactLogHistory[0].count,
                    engagementLogCount: engagementLogHistory[0].count,
                },
            };

            return engagement;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

const getContactLogCount = (connection: Knex, engagementId: number) => {
    const query = connection.queryBuilder();

    query
        .count("Engagement_Contact_Log_ID as count")
        .from("Engagement_Contact_Logs")
        .where("Engagement_ID", engagementId);

    return query;
};

const getEngagementLogCount = (connection: Knex, engagementId: number) => {
    const query = connection.queryBuilder();

    query.count("Engagement_Log_ID as count").from("Engagement_Log").where("Engagement_ID", engagementId);

    return query;
};