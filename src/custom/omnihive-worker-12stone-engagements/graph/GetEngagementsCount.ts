import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { Knex } from "knex";
import { serializeError } from "serialize-error";

// import { EngagementModel } from "../lib/models/Engagement";
// import { countQueryBuilder } from "../queries/countQueryBuilder";

interface Args {
    ownerId: number;
}

interface Statuses {
    New: number;
    Open: number;
    Snoozed: number;
    Closed: number;
}

export default class GetEngagmentsCount extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<{}> => {
        try {
            if (!customArgs?.ownerId) {
                throw new Error("GetEngagementsCount requires a customArg of ownerId");
            }
            // Get the connection to the database
            const worker = await this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");

            // Set connection as Knex
            const connection = worker?.connection as Knex;

            // PAGE ARGS
            const { ownerId } = customArgs;

            // GET TOTAL ENGAGEMENTS COUNT
            const countQuery = countQueryBuilder(connection, ownerId);
            const res = await worker?.executeQuery(countQuery.toString());

            const data = res && res[0];
            const countObj: Statuses = {
                New: 0,
                Open: 0,
                Snoozed: 0,
                Closed: 0,
            };
            data?.forEach((item: { Name: "New" | "Open" | "Snoozed" | "Closed"; count: number }) => {
                countObj[item.Name] = item.count;
            });

            return countObj;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

const countQueryBuilder = (connection: Knex, ownerId: number) => {
    const builder = connection.queryBuilder();

    builder
        .select("es.Name")
        .count("e.Engagement_ID as count")
        .from("Engagements as e")
        .innerJoin("Engagement_Statuses as es", "e.Engagement_Status_ID", "es.Engagement_Status_ID")
        .where("Owner_Contact_ID", ownerId)
        .groupBy("es.Name");

    return builder;
};
