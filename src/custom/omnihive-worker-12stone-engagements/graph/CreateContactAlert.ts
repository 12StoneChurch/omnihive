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

import { ContactAlertModel } from "../lib/models/ContactAlert";

interface Args {
    contactId: number;
    description: string;
    createdByContactId: number;
}

const argsSchema = Joi.object({
    contactId: Joi.number().integer().required(),
    description: Joi.string().min(1).max(2000).required(),
    createdByContactId: Joi.number().integer().default(1),
});

export default class CreateAlert extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<ContactAlertModel> => {
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

            /* Get user id of creator */
            const selectUserIdQuery = selectUserId(connection, customArgs);
            const selectUserIdRes = await worker?.executeQuery(selectUserIdQuery.toString());
            const { User_ID: userId }: SelectUserIdDTO = selectUserIdRes && selectUserIdRes[0][0];

            /* Get first and last name of creator */
            const selectCreatedByQuery = selectCreatedByContact(connection, customArgs);
            const selectCreatedByQueryRes = await worker?.executeQuery(selectCreatedByQuery.toString());
            const { First_Name: firstName, Last_Name: lastName }: SelectCreatedByContactDTO =
                selectCreatedByQueryRes && selectCreatedByQueryRes[0][0];

            /* Insert contact log */
            const insertLogQuery = insertContactLog(connection, customArgs, userId);
            const insertLogRes = await worker?.executeQuery(insertLogQuery.toString());
            const {
                Contact_Log_ID: contactLogId,
                Notes: description,
                Contact_Date: dateCreated,
            }: InsertContactLogDTO = insertLogRes && insertLogRes[0][0];

            const alert: ContactAlertModel = {
                contactLogId,
                contactId: customArgs.contactId,
                description,
                dateCreated: dayjs(dateCreated).toDate(),
                createdBy: {
                    contactId: customArgs.createdByContactId,
                    firstName: firstName ?? undefined,
                    lastName: lastName ?? undefined,
                },
            };

            return alert;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

interface SelectUserIdDTO {
    User_ID: number;
}

const selectUserId = (connection: Knex, data: Args) => {
    const { createdByContactId } = data;

    const builder = connection.queryBuilder();
    builder.select(["u.User_ID"]).from({ u: "dp_Users" }).where({ Contact_ID: createdByContactId });
    return builder;
};

interface InsertContactLogDTO {
    Contact_Log_ID: number;
    Contact_ID: number;
    Contact_Date: string;
    Notes: string;
}

const insertContactLog = (connection: Knex, data: Args, userId: number) => {
    const { contactId, description } = data;

    const builder = connection.queryBuilder();
    builder
        .insert({
            Contact_ID: contactId,
            Contact_Date: dayjs().toISOString(),
            Notes: description,
            Domain_ID: 1,
            Contact_Log_Type_ID: 7,
            Made_By: userId,
        })
        .into("Contact_Log")
        .returning(["*"]);

    return builder;
};

interface SelectCreatedByContactDTO {
    First_Name: string;
    Last_Name: string;
}

const selectCreatedByContact = (connection: Knex, data: Args) => {
    const { contactId } = data;

    const builder = connection.queryBuilder();
    builder.select(["c.First_Name", "c.Last_Name"]).from({ c: "Contacts" }).where({ Contact_ID: contactId });

    return builder;
};
