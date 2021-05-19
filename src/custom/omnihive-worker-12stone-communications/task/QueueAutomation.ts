import { ITaskEndpointWorker } from "@withonevision/omnihive-core/interfaces/ITaskEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { sendEmails } from "../common/sendEmails";
import { sendTwilioSms } from "../common/sendTwilioSms";
import { Listr } from "listr2";
import { MailDataRequired } from "@sendgrid/mail";
import { updateCommunicationMessageStatus } from "../common/updateCommunicationMessageStatus";
import { getMessages } from "../common/getCommunicationMessages";

export default class CmsSearchImporter extends HiveWorkerBase implements ITaskEndpointWorker {
    private messages: any;

    public execute = async (): Promise<any> => {
        const graphUrl = `${this.serverSettings.config.webRootUrl}/${this.config.metadata.dataSlug}`;

        const tasks = new Listr<any>([
            {
                title: "Get Messages",
                task: async () => (this.messages = await getMessages(graphUrl)),
                retry: 5,
                options: {
                    persistentOutput: true,
                    showTimer: true,
                },
            },
            {
                title: "Send Emails",
                task: this.sendEmails,
                retry: 1,
                options: {
                    persistentOutput: true,
                    showTimer: true,
                },
            },
            {
                title: "Send SMS Messages",
                task: this.sendSms,
                retry: 1,
                options: {
                    persistentOutput: true,
                    showTimer: true,
                },
            },
        ]);

        await tasks.run();
    };

    private sendEmails = async (): Promise<void> => {
        const emails: MailDataRequired[] = [];
        const graphUrl = `${this.serverSettings.config.webRootUrl}/${this.config.metadata.dataSlug}`;
        const sentEmailData = [];

        for (const message of this.messages.filter((message: any) => message.MessageTypeId === 1)) {
            const idObj: { id: number; contactId: number } = {
                id: message.CommunicationId,
                contactId: message.ContactId,
            };

            if (!message.ToAddress || !message.FromAddress || !message.Body) {
                await updateCommunicationMessageStatus(
                    graphUrl,
                    idObj.id,
                    idObj.contactId,
                    9,
                    "Recipient's e-mail address or phone number is not provided."
                );
            } else {
                emails.push({
                    to: message.ToAddress,
                    from: message.FromAddress,
                    subject: message.Subject,
                    html: message.Body,
                    customArgs: {
                        ApplicationName: "CommunicationManager",
                        CommunicationId: idObj.id,
                        ContactId: idObj.contactId,
                    },
                });

                sentEmailData.push({ commId: idObj.id, contactId: idObj.contactId });
            }
        }

        try {
            await sendEmails(emails, this.config.metadata);

            for (const ids of sentEmailData) {
                await updateCommunicationMessageStatus(graphUrl, ids.commId, ids.contactId, 3);
            }
        } catch (err) {
            throw new Error(err);
        }
    };

    private sendSms = async (): Promise<void> => {
        const texts = [];
        const graphUrl = `${this.serverSettings.config.webRootUrl}/${this.config.metadata.dataSlug}`;

        for (const message of this.messages.filter((message: any) => message.MessageTypeId === 2)) {
            if (!message.ToAddress || !message.FromAddress || !message.Body) {
                await updateCommunicationMessageStatus(
                    graphUrl,
                    message.CommunicationId,
                    message.ContactId,
                    9,
                    "Recipient's e-mail address or phone number is not provided."
                );
            } else {
                texts.push({
                    data: {
                        to: "+1" + message.ToAddress.replace(/-/g, ""),
                        from: "+1" + message.FromAddress,
                        body: message.Body,
                    },
                    id: message.CommunicationId,
                    contactId: message.ContactId,
                });

                try {
                    const results = await sendTwilioSms(texts, this.config.metadata);

                    for (const ids of results.sent) {
                        await updateCommunicationMessageStatus(graphUrl, ids.id, ids.contactId, 3, "", ids.sid);
                    }
                } catch (err) {
                    throw new Error(err);
                }
            }
        }
    };
}
