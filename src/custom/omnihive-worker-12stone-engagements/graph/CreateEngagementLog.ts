import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import type { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import type { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import dayjs from "dayjs";
import Joi from "joi";
import type { Knex } from "knex";
import { serializeError } from "serialize-error";
import type { GraphContext } from "src/packages/omnihive-core/models/GraphContext";

import { EngagementLogModel } from "../lib/models/EngagementLog";
import { insertEngagementLogQuery, selectInsertedEngagementLogQuery } from "../queries/insertEngagementLog";

interface Args {
    engagementId: number;
    description?: string;
    typeId: number;
}

const argsSchema = Joi.object({
    engagementId: Joi.number().integer().required(),
    description: Joi.string().max(1000).optional(),
    typeId: Joi.number().integer().required(),
});

export default class CreateEngagementLog extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<EngagementLogModel> => {
        try {
            /* Get database connection */
            const worker = this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");
            const connection = worker?.connection as Knex;

            /* Validate and clean custom arguments */
            const { value, error } = argsSchema.validate(customArgs);

            if (error) {
                throw new Error(`Invalid customArgs: ${error.message}`);
            } else {
                customArgs = value;
            }

            /* Insert engagement log */
            const insertQuery = insertEngagementLogQuery(connection, customArgs);
            const insertRes = await worker?.executeQuery(insertQuery.toString());
            const { Engagement_Log_ID: id } = insertRes && insertRes[0][0];

            /* Select inserted engagement log */
            const selectQuery = selectInsertedEngagementLogQuery(connection, id);
            const selectRes = await worker?.executeQuery(selectQuery.toString());
            const selectData: InsertedEngagementLogDTO = selectRes && selectRes[0][0];

            const engagementLog: EngagementLogModel = {
                engagementLogId: selectData.Engagement_Log_ID,
                engagementId: selectData.Engagement_ID,
                description: selectData.Description,
                dateCreated: dayjs(selectData.Date_Created).toDate(),
                type: { id: selectData.Engagement_Log_Type_ID, name: selectData.Engagement_Log_Type_Name },
                source: "EngagementLog",
            };

            return engagementLog;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

interface InsertedEngagementLogDTO {
    Engagement_Log_ID: number;
    Engagement_ID: number;
    Description: string;
    Date_Created: string;
    Engagement_Log_Type_ID: number;
    Engagement_Log_Type_Name: string;
    Domain_ID: number;
}