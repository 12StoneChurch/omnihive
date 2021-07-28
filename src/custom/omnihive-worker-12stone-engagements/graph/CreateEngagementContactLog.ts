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
    engagementId: number;
    description: string;
    createdByContactId: number;
}

const argsSchema = Joi.object({
    engagementId: Joi.number().integer().required(),
    description: Joi.string().max(2000).required(),
    createdByContactId: Joi.number().integer().default(1),
});

export default class CreateEngagementContactLog extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<EngagementContactLogModel> => {
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

            /* Get contact id from engagement */
            const selectContactIdQuery = selectContactId(connection, customArgs);
            const selectContactIdRes = await worker?.executeQuery(selectContactIdQuery.toString());
            const { Contact_ID: contactId }: SelectContactIdDTO = selectContactIdRes && selectContactIdRes[0][0];

            /* Get user id of creator */
            const selectUserIdQuery = selectUserId(connection, customArgs);
            const selectUserIdRes = await worker?.executeQuery(selectUserIdQuery.toString());
            const { User_ID: userId }: SelectUserIdDTO = selectUserIdRes && selectUserIdRes[0][0];

            /* Insert contact log */
            const insertLogQuery = insertContactLog(connection, customArgs, contactId, userId);
            const insertLogRes = await worker?.executeQuery(insertLogQuery.toString());
            const {
                Contact_Log_ID: contactLogId,
                Notes: description,
                Contact_Date: dateCreated,
            }: InsertContactLogDTO = insertLogRes && insertLogRes[0][0];

            /* Insert engagement contact log */
            const insertEngagementLogQuery = insertEngagementContactLog(connection, customArgs, contactLogId);
            const insertEngagementLogRes = await worker?.executeQuery(insertEngagementLogQuery.toString());
            const {
                Engagement_Contact_Log_ID: engagementContactLogId,
                Engagement_ID: engagementId,
            }: InsertEngagementContactLogDTO = insertEngagementLogRes && insertEngagementLogRes[0][0];

            const engagementContactLog: EngagementContactLogModel = {
                engagementContactLogId,
                engagementId,
                description,
                dateCreated: dayjs(dateCreated).toDate(),
                source: "EngagementContactLog",
            };

            return engagementContactLog;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

interface SelectContactIdDTO {
    Contact_ID: number;
}

const selectContactId = (connection: Knex, data: Args) => {
    const { engagementId } = data;

    const builder = connection.queryBuilder();
    builder.select(["e.Contact_ID"]).from({ e: "Engagements" }).where({ Engagement_ID: engagementId });
    return builder;
};

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

const insertContactLog = (connection: Knex, data: Args, contactId: number, userId: number) => {
    const { description } = data;

    const builder = connection.queryBuilder();
    builder
        .insert({
            Contact_ID: contactId,
            Contact_Date: dayjs().toISOString(),
            Notes: description,
            Domain_ID: 1,
            Contact_Log_Type_ID: 6,
            Made_By: userId,
        })
        .into("Contact_Log")
        .returning(["*"]);

    return builder;
};

interface InsertEngagementContactLogDTO {
    Engagement_Contact_Log_ID: number;
    Engagement_ID: number;
    Contact_Log_ID: number;
}

const insertEngagementContactLog = (connection: Knex, data: Args, contactLogId: number) => {
    const { engagementId } = data;

    const builder = connection.queryBuilder();
    builder
        .insert({ Engagement_ID: engagementId, Contact_Log_ID: contactLogId, Domain_ID: 1 })
        .into("Engagement_Contact_Logs")
        .returning(["*"]);

    return builder;
};
