import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { Knex } from "knex";
import { serializeError } from "serialize-error";

import { HiveWorkerType } from "../../../packages/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "../../../packages/omnihive-core/interfaces/IDatabaseWorker";

// import { EngagementModel } from "../lib/models/Engagement";
// import { countQueryBuilder } from "../queries/countQueryBuilder";

interface Args {
    ownerId: number;
}

export default class GetAllEngagements extends HiveWorkerBase implements IGraphEndpointWorker {
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

            const data = res && res[0][0];

            return data;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

const countQueryBuilder = (connection: Knex, ownerId: number) => {
    const builder = connection.queryBuilder();

    builder.count("Engagement_ID as count").from("Engagements").where("Owner_Contact_ID", ownerId);

    return builder;
};
