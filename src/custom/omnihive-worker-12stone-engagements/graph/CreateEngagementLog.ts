import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import type { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import type { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import dayjs from "dayjs";
import Joi from "joi";
import type { Knex } from "knex";
import { serializeError } from "serialize-error";

import { EngagementLogModel } from "../lib/models/EngagementLog";
import {
    insertEngagementLogQuery,
    selectEngagementStatusesQuery,
    selectInsertedEngagementLogQuery,
    updateEngagementStatusQuery,
} from "../queries/insertEngagementLog";

export interface CreateEngagementWorkerArgs {
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
    public execute = async (
        customArgs: CreateEngagementWorkerArgs,
        _omniHiveContext: GraphContext
    ): Promise<EngagementLogModel> => {
        try {
            /* Verify auth token */
            await verifyToken(_omniHiveContext);

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

            /* Update the engagement status to Open if it is New or Snoozed and the Engagement log is initiated because of a contact event */
            if (
                ["Email Sent", "Text Sent", "Call Initiated"].includes(engagementLog.type.name) &&
                ["New", "Snoozed"].includes(selectData.Engagement_Status_Name)
            ) {
                const selectOpenStatusQuery = selectEngagementStatusesQuery(connection);
                const selectOpenStatusRes = (await worker?.executeQuery(
                    selectOpenStatusQuery.toString()
                )) as EngagementStatusesDTO[][];

                const engagementOpenStatus = selectOpenStatusRes && selectOpenStatusRes[0][0];
                const openStatusId = engagementOpenStatus.Engagement_Status_ID;

                const updateStatusQuery = updateEngagementStatusQuery(connection, customArgs, openStatusId);
                await worker?.executeQuery(updateStatusQuery.toString());
            }

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
    Engagement_Status_Name: string;
}

interface EngagementStatusesDTO {
    Engagement_Status_ID: number;
    Name: string;
}
