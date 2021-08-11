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

import {
    EngagementContactLogModel,
    EngagementLogModel,
    EngagementLogOrEngagementContactLogModel,
} from "../lib/models/EngagementLog";

interface Args {
    engagementId: number;
}

const argsSchema = Joi.object({
    engagementId: Joi.number().integer().required(),
});

export default class GetEngagementHistory extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (
        customArgs: Args,
        _omniHiveContext: GraphContext
    ): Promise<EngagementLogOrEngagementContactLogModel[]> => {
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

            /* Select engagement history */
            const selectHistoryQuery = selectEngagementHistory(connection, customArgs.engagementId);
            const selectHistoryRes = await worker?.executeQuery(selectHistoryQuery.toString());
            const selectHistoryData: SelectEngagementHistoryDTO[] = selectHistoryRes ? selectHistoryRes[0] : [];

            const selectHistory: EngagementLogOrEngagementContactLogModel[] = selectHistoryData.map((dto) => {
                if (dto.Source === "EngagementLog") {
                    const engagementLog: EngagementLogModel = {
                        engagementLogId: dto.Engagement_Log_Or_Contact_Log_ID,
                        engagementId: dto.Engagement_ID,
                        description: dto.Description,
                        type: {
                            id: dto.Engagement_Log_Type_ID,
                            name: dto.Engagement_Log_Type_Name,
                        },
                        dateCreated: dayjs(dto.Date_Created).toDate(),
                        source: dto.Source,
                    };
                    return engagementLog;
                } else {
                    const engagementContactLog: EngagementContactLogModel = {
                        engagementContactLogId: dto.Engagement_Log_Or_Contact_Log_ID,
                        engagementId: dto.Engagement_ID,
                        description: dto.Description,
                        dateCreated: dayjs(dto.Date_Created).toDate(),
                        source: dto.Source,
                    };
                    return engagementContactLog;
                }
            });

            return selectHistory;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

interface SelectEngagementHistoryDTO {
    Engagement_Log_Or_Contact_Log_ID: number;
    Engagement_ID: number;
    Description: string;
    Date_Created: string;
    Engagement_Log_Type_ID: number;
    Engagement_Log_Type_Name: string;
    Domain_ID: number;
    Source: "EngagementLog" | "EngagementContactLog";
}

const selectEngagementHistory = (connection: Knex, id: number) => {
    const builder = connection.queryBuilder();
    builder
        .select(
            "el.Engagement_Log_ID as Engagement_Log_Or_Contact_Log_ID",
            "el.Engagement_ID",
            "el.Description",
            "el.Date_Created",
            "el.Engagement_Log_Type_ID",
            "elt.Name as Engagement_Log_Type_Name",
            "el.Domain_ID",
            connection.raw(`'EngagementLog' as Source`)
        )
        .from({ el: "Engagement_Log" })
        .innerJoin("Engagement_Log_Types as elt", "el.Engagement_Log_Type_ID", "elt.Engagement_Log_Type_ID")
        .where({ Engagement_ID: id })
        .unionAll(function () {
            this.select(
                "ecl.Engagement_Contact_Log_ID as Engagement_Log_Or_Contact_Log_ID",
                "ecl.Engagement_ID",
                "cl.Notes as Description",
                "cl.Contact_Date as Date_Created",
                connection.raw(`null as Engagement_Log_Type_ID`),
                connection.raw(`null as Engagement_Log_Type_Name`),
                "ecl.Domain_ID",
                connection.raw(`'EngagementContactLog' as Source`)
            )
                .from({
                    ecl: "Engagement_Contact_Logs",
                })
                .innerJoin("Contact_Log as cl", "ecl.Contact_Log_ID", "cl.Contact_Log_ID")
                .where({ Engagement_ID: id });
        })
        .orderBy("Date_Created", "asc");

    return builder;
};
