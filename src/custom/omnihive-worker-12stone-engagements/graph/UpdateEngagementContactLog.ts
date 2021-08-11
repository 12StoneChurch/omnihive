import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import type { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import type { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import dayjs from "dayjs";
import Joi from "joi";
import type { Knex } from "knex";
import { serializeError } from "serialize-error";

import { EngagementContactLogModel } from "../lib/models/EngagementLog";

interface Args {
    engagementContactLogId: number;
    description: string;
}

const argsSchema = Joi.object({
    engagementContactLogId: Joi.number().integer().positive().required(),
    description: Joi.string().max(2000).required(),
});

export default class UpdateEngagementContactLog extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<EngagementContactLogModel> => {
        try {
            /* get database connection */
            const worker = this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");
            const connection = worker?.connection as Knex;

            /* validate and clean custom arguments */
            const { value, error } = argsSchema.validate(customArgs);

            if (error) {
                throw new Error(`Invalid customArgs: ${error.message}`);
            } else {
                customArgs = value;
            }

            /* select contact log id */
            const selectContactLogIdQuery = selectContactLogIdBuilder(connection, customArgs);
            const selectContactLogIdResult = (await worker?.executeQuery(
                selectContactLogIdQuery.toString()
            )) as SelectContactLogIdDTO[][];
            const { contact_log_id } = selectContactLogIdResult && selectContactLogIdResult[0][0];

            /* update contact log */
            const updateContactLogQuery = updateContactLogBuilder(connection, customArgs, contact_log_id);
            await worker?.executeQuery(updateContactLogQuery.toString());

            /* select updated engagement contact log */
            const selectContactLogQuery = selectContactLogBuilder(connection, contact_log_id);
            const selectContactLogResult = (await worker?.executeQuery(
                selectContactLogQuery.toString()
            )) as SelectContactLogDTO[][];
            const dto = selectContactLogResult && selectContactLogResult[0][0];

            return {
                engagementContactLogId: dto.engagement_contact_log_id,
                engagementId: dto.engagement_id,
                description: dto.description,
                dateCreated: dayjs(dto.date_created).toDate(),
                source: "EngagementContactLog",
            };
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

interface SelectContactLogIdDTO {
    contact_log_id: number;
}

const selectContactLogIdBuilder = (connection: Knex, data: Args) => {
    const builder = connection.queryBuilder();
    builder
        .select(["cl.contact_log_id as contact_log_id"])
        .from({ cl: "contact_log" })
        .leftJoin({ ecl: "engagement_contact_logs" }, { "cl.contact_log_id": "ecl.contact_log_id" })
        .where({ "ecl.engagement_contact_log_id": data.engagementContactLogId });

    return builder;
};

const updateContactLogBuilder = (connection: Knex, data: Args, contact_log_id: number) => {
    const builder = connection.queryBuilder();
    builder.update({ notes: data.description }).from("contact_log").where({ contact_log_id });

    return builder;
};

interface SelectContactLogDTO {
    engagement_contact_log_id: number;
    contact_log_id: number;
    engagement_id: number;
    contact_id: number;
    description: string;
    date_created: string;
    created_by_contact_id: number;
    created_by_first_name: string;
    created_by_last_name: string;
}

const selectContactLogBuilder = (connection: Knex, contact_log_id: number) => {
    const builder = connection.queryBuilder();
    builder
        .select([
            "ecl.engagement_contact_log_id as engagement_contact_log_id",
            "ecl.engagement_id as engagement_id",
            "cl.contact_log_id as contact_log_id",
            "cl.contact_id as contact_id",
            "cl.notes as description",
            "cl.contact_date as date_created",
            "c.contact_id as created_by_contact_id",
            "c.first_name as created_by_first_name",
            "c.last_name as created_by_last_name",
        ])
        .from({ cl: "contact_log" })
        .join({ ecl: "engagement_contact_logs" }, { "cl.contact_log_id": "ecl.contact_log_id" })
        .join({ u: "dp_users" }, { "u.user_id": "cl.made_by" })
        .join({ c: "contacts" }, { "c.contact_id": "u.contact_id" })
        .where({ "cl.contact_log_id": contact_log_id });

    return builder;
};
