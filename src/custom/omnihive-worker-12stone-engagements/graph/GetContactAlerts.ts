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
    contactId: number;
}

const argsSchema = Joi.object({
    contactId: Joi.number().integer().required(),
});

export default class GetAlerts extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<ContactAlertModel[]> => {
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

            /* select alerts */
            const query = selectAlerts(connection, customArgs);
            const res = await worker?.executeQuery(query.toString());
            const data: SelectAlertsDTO[] = res ? res[0] : [];

            const alerts: ContactAlertModel[] = data.map((dto) => {
                return {
                    contactLogId: dto.contact_log_id,
                    contactId: dto.contact_id,
                    description: dto.description,
                    dateCreated: dayjs(dto.date_created).toDate(),
                    createdBy: {
                        contactId: dto.created_by_contact_id,
                        firstName: dto.created_by_first_name ?? undefined,
                        lastName: dto.created_by_last_name ?? undefined,
                    },
                };
            });

            return alerts;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

interface SelectAlertsDTO {
    contact_log_id: number;
    contact_id: number;
    description: string;
    date_created: string;
    created_by_contact_id: number;
    created_by_first_name: string | null;
    created_by_last_name: string | null;
}

const selectAlerts = (connection: Knex, data: Args) => {
    const { contactId } = data;

    const builder = connection.queryBuilder();
    builder
        .select([
            "cl.contact_log_id",
            "cl.contact_id",
            "cl.notes as description",
            "cl.contact_date as date_created",
            "c.contact_id as created_by_contact_id",
            "c.first_name as created_by_first_name",
            "c.last_name as created_by_last_name",
        ])
        .from({ cl: "contact_log" })
        .innerJoin("dp_users as u", "u.user_id", "cl.made_by")
        .innerJoin("contacts as c", "c.contact_id", "u.contact_id")
        .where({ "cl.contact_id": contactId, "cl.contact_log_type_id": 7 })
        .orderBy("cl.contact_date", "asc");

    return builder;
};
