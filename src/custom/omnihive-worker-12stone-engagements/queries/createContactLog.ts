import dayjs from "dayjs";
import { Knex } from "knex";

interface Args {
    contactId: number;
    contactDate?: Date;
    notes: string;
    ownerUserId: number; // Owner User Id becomes Made_By in contact log
    engagementId: number;
}

export const createContactLogQuery = async (connection: Knex<any | unknown>, customArgs: Args) => {
    // 1. Create contact log, returns contact_log_id - include domain id, contact log type id, contact date
    // 2. Create engagement_contact_log

    try {
        const date = customArgs?.contactDate ?? dayjs().toISOString();
        const contactLogData = {
            Contact_ID: customArgs.contactId,
            Contact_Date: date,
            Notes: customArgs.notes,
            Domain_ID: 1,
            Made_By: customArgs.ownerUserId,
        };

        // Transaction reverts all if anything fails
        return await connection.transaction(async (trx) => {
            const contactLogId = await trx("Contact_Log").insert(contactLogData).returning("Contact_Log_ID");

            const engagementContactLogData = {
                Contact_Log_ID: contactLogId[0],
                Engagement_ID: customArgs.engagementId,
                Domain_ID: 1,
            };
            const engagementContactLogId = await trx("Engagement_Contact_Logs")
                .insert(engagementContactLogData)
                .returning("Engagement_Contact_Log_ID");

            return {
                contactLogId: contactLogId[0],
                engagementContactLogId: engagementContactLogId[0],
            };
        });
    } catch (err) {
        throw new Error(err);
    }
};
