import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import type { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import type { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import dayjs from "dayjs";
import Joi from "joi";
import type { Knex } from "knex";
import { serializeError } from "serialize-error";

import { ContactAlertModel } from "../lib/models/ContactAlert";

interface Args {
    contactLogId: number;
    description?: string;
    archived?: boolean;
}

const argsSchema = Joi.object({
    contactLogId: Joi.number().integer().required(),
    description: Joi.string().min(1).max(2000).optional(),
    archived: Joi.boolean().optional(),
}).or("description", "archived");

export default class UpdateAlert extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<ContactAlertModel> => {
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

            /* update alert */
            const updateQuery = updateBuilder(connection, customArgs).toString();
            await worker?.executeQuery(updateQuery);

            /* get updated alert */
            const selectQuery = selectBuilder(connection, customArgs).toString();
            const [[dto]] = (await worker?.executeQuery(selectQuery)) as SelectContactLogDTO[][];

            const alert: ContactAlertModel = {
                contactLogId: dto.contact_log_id,
                contactId: dto.contact_id,
                description: dto.description,
                dateCreated: dayjs(dto.date_created).toDate(),
                createdBy: {
                    contactId: dto.created_by_contact_id,
                    firstName: dto.created_by_first_name,
                    lastName: dto.created_by_last_name,
                },
            };

            return alert;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

interface SelectContactLogDTO {
    contact_log_id: number;
    contact_id: number;
    description: string;
    date_created: string;
    created_by_contact_id: number;
    created_by_first_name: string;
    created_by_last_name: string;
}

const updateBuilder = (connection: Knex, args: Args) => {
    const builder = connection.queryBuilder();

    const data: Record<string, unknown> = {};

    if (args.description !== undefined) {
        data.notes = args.description;
    }
    if (args.archived !== undefined) {
        data.archived = args.archived ? 1 : 0;
    }

    builder.update(data).from("contact_log").where({ contact_log_id: args.contactLogId });

    return builder;
};

const selectBuilder = (connection: Knex, args: Args) => {
    const builder = connection.queryBuilder();

    builder
        .select([
            "cl.contact_log_id as contact_log_id",
            "cl.contact_id as contact_id",
            "cl.notes as description",
            "cl.contact_date as date_created",
            "c.contact_id as created_by_contact_id",
            "c.first_name as created_by_first_name",
            "c.last_name as created_by_last_name",
        ])
        .from({ cl: "contact_log" })
        .join("dp_users as u", { "u.user_id": "cl.made_by" })
        .join("contacts as c", { "c.contact_id": "u.contact_id" })
        .where({ "cl.contact_log_id": args.contactLogId });

    return builder;
};
