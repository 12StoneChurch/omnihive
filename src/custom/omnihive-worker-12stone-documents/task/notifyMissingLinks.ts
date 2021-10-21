import { MailDataRequired } from "@sendgrid/mail";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import * as dayjs from "dayjs";
import { Knex } from "knex";
import { getDatabaseObjects } from "@12stonechurch/omnihive-worker-common/helpers/GenericFunctions";
import { sendEmails } from "@12stonechurch/omnihive-worker-communications/common/sendEmails";
import { ITaskEndpointWorker } from "@withonevision/omnihive-core/interfaces/ITaskEndpointWorker";

export default class NotifyMissingLinks extends HiveWorkerBase implements ITaskEndpointWorker {
    private databaseWorker?: IDatabaseWorker;
    private knex?: Knex;

    public execute = async (): Promise<void> => {
        const { databaseWorker, knex } = getDatabaseObjects(this, "dbMinistryPlatform");
        this.databaseWorker = databaseWorker;
        this.knex = knex;

        const missingLinks = await this.getMissingLinks();

        if (missingLinks && missingLinks.length > 0) {
            await this.sendErrorEmail(missingLinks);
        }
    };

    private getMissingLinks = async () => {
        if (!this.databaseWorker) {
            throw new Error("The database worker is not configured properly");
        }

        if (!this.knex) {
            throw new Error("Knex has not been properly initialized");
        }

        const queryBuilder = this.knex.queryBuilder();

        queryBuilder.from("DocuSign_Envelopes as de");
        queryBuilder.innerJoin("Contacts as c", "c.Contact_ID", "de.Contact_ID");
        queryBuilder.innerJoin("DocuSign_Forms as df", "df.DocuSign_Form_ID", "de.Form_ID");
        queryBuilder.whereNull("de.Envelope_ID");
        queryBuilder.andWhere("de.Null_Envelope_Email_Sent", 0);
        queryBuilder.select(
            "de.DocuSign_Envelope_ID as id",
            "df.Name as formName",
            "c.Contact_ID as contactId",
            "c.First_Name as firstName",
            "c.Last_Name as lastName",
            "de._Created_Date as createDate",
            "de._Last_Updated_Date as updateDate"
        );

        return (await AwaitHelper.execute(this.databaseWorker.executeQuery(queryBuilder.toString())))?.[0];
    };

    private sendErrorEmail = async (envelopeData: any[]) => {
        if (!this.knex) {
            throw new Error("Knex has not been properly initialized");
        }

        const emailModel: MailDataRequired[] = [
            {
                html: `
                <div style="margin-left: 0px">
                    DocuSign Envelope Errors:
                    <div style="margin-left: 8px; margin-bottom: 16px">
                        These Documents need to be relinked with their DocuSign Ids. These can be found <a href="${
                            this.metadata.docuSignDocumentUrl
                        }">here</a>.
                    </div>
                        ${envelopeData.map(
                            (data) => `
                        <div style="margin-left: 8px">
                            User Document Row Data: 
                            <div style="margin-left: 16px">
                                User Document Id: ${data.id}
                            </div>
                            <div style="margin-left: 16px">
                                Template Name: ${data.formName}
                            </div>
                            <div style="margin-left: 16px">
                                Contact Id: ${data.contactId}
                            </div>
                            <div style="margin-left: 16px">
                                Contact Name: ${data.firstName} ${data.lastName}
                            </div>
                            <div style="margin-left: 16px">
                                Document Creation Date/Time: ${dayjs(data.createDate).format("M/D/YYYY hh:mm:ss a")}
                            </div>
                            <div style="margin-left: 16px; margin-bottom: 8px">
                                Document Last Updated Date/Time: ${dayjs(data.update).format("M/D/YYYY hh:mm:ss a")}
                            </div>
                        </div>
                        `
                        )}
                </div>
                `,
                to: this.metadata.errorEmail,
                from: this.metadata.fromEmail,
                subject: `DocuSign User Document Error`,
            },
        ];

        try {
            if (!this.databaseWorker) {
                throw new Error("The database worker is not configured properly");
            }

            if (!this.knex) {
                throw new Error("Knex has not been properly initialized");
            }

            await sendEmails(emailModel, this.metadata);

            const queryBuilder = this.knex.queryBuilder();
            queryBuilder.from("DocuSign_Envelopes");
            queryBuilder.whereIn(
                "DocuSign_Envelope_ID",
                envelopeData.map((x) => x.id)
            );
            queryBuilder.update({ Null_Envelope_Email_Sent: 1 });

            await this.databaseWorker.executeQuery(queryBuilder.toString());
        } catch (err) {
            console.log(err);
        }
    };
}
