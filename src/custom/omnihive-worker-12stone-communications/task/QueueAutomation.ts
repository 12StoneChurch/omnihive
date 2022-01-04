import { ITaskEndpointWorker } from "@withonevision/omnihive-core/interfaces/ITaskEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { sendEmails } from "../common/sendEmails";
import { sendTwilioSms } from "../common/sendTwilioSms";
import { Listr } from "listr2";
import { MailDataRequired } from "@sendgrid/mail";
import { updateCommunicationMessageStatus } from "../common/updateCommunicationMessageStatus";
import { getMessages } from "../common/getCommunicationMessages";
import { IsHelper } from "@withonevision/omnihive-core/helpers/IsHelper";
import { init } from "../lib/services/GraphService";
import { AwaitHelper } from "src/packages/omnihive-core/helpers/AwaitHelper";

export default class QueueAutomation extends HiveWorkerBase implements ITaskEndpointWorker {
    private messages: any;
    private sentTexts: { [phoneNumber: string]: number[] } = {};

    public execute = async (): Promise<any> => {
        await init(this.registeredWorkers, this.environmentVariables);

        const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

        if (IsHelper.isNullOrUndefined(webRootUrl)) {
            throw new Error("Web Root URL undefined");
        }

        const graphUrl = `${webRootUrl}/${this.metadata.dataSlug}`;

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
        try {
            const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

            if (IsHelper.isNullOrUndefined(webRootUrl)) {
                throw new Error("Web Root URL undefined");
            }

            const emails: MailDataRequired[] = [];
            const graphUrl = `${webRootUrl}/${this.metadata.dataSlug}`;
            const sentEmailData = [];

            for (const message of this.messages.filter((message: any) => message.MessageTypeId === 1)) {
                const idObj: { id: number; contactId: number } = {
                    id: message.CommunicationId,
                    contactId: message.ContactId,
                };

                if (!message.ToAddress || !message.FromAddress || !message.Body) {
                    await AwaitHelper.execute(
                        updateCommunicationMessageStatus(
                            graphUrl,
                            idObj.id,
                            idObj.contactId,
                            9,
                            "Recipient's e-mail address or phone number is not provided."
                        )
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
                        trackingSettings: {
                            clickTracking: {
                                enable: true,
                            },
                            openTracking: {
                                enable: true,
                            },
                        },
                    });

                    sentEmailData.push({ commId: idObj.id, contactId: idObj.contactId });
                }
            }

            await AwaitHelper.execute(sendEmails(emails, this.metadata));

            for (const ids of sentEmailData) {
                await AwaitHelper.execute(updateCommunicationMessageStatus(graphUrl, ids.commId, ids.contactId, 3));
            }
        } catch (err: any) {
            // servernotifications@withone.vision
            const args = [
                {
                    to: "servernotifications@withone.vision",
                    from: "noreply@12stone.com",
                    subject: "Comm Manager - SendGrid Error",
                    html: `
                    <div>
                        <h2>Communication Manager Error - SendGrid Send</h2>
                        <br />
                        <table>
                            <tr>
                                <td>
                                    Communication IDs
                                </td>
                                <td>
                                    [${this.messages.map((x: any) => x.CommunicationId)}]
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    Contact IDs
                                </td>
                                <td>
                                    [${this.messages.map((x: any) => x.ContactId)}]
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    Email Addresses
                                </td>
                                <td>
                                    [${this.messages.map((x: any) => x.ToAddress)}]
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    Error
                                </td>
                                <td>
                                    ${err.message}
                                </td>
                            </tr>
                        </table>
                    </div>
                `,
                },
            ];

            await AwaitHelper.execute(sendEmails(args, this.metadata));
        }
    };

    private sendSms = async (): Promise<void> => {
        const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

        if (IsHelper.isNullOrUndefined(webRootUrl)) {
            throw new Error("Web Root URL undefined");
        }

        const graphUrl = `${webRootUrl}/${this.metadata.dataSlug}`;

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
                if (
                    this.sentTexts[message.ToAddress] &&
                    this.sentTexts[message.ToAddress].length > 0 &&
                    this.sentTexts[message.ToAddress].some((x: number) => x === message.CommunicationId)
                ) {
                    await updateCommunicationMessageStatus(
                        graphUrl,
                        message.CommunicationId,
                        message.ContactId,
                        9,
                        "Recipient's phone number is duplicated and the message has already been sent to this number."
                    );
                } else {
                    const text = {
                        data: {
                            to: "+1" + message.ToAddress.replace(/-/g, ""),
                            from: message.FromAddress.length > 5 ? "+1" + message.FromAddress : message.FromAddress,
                            body: message.Body,
                        },
                        id: message.CommunicationId,
                        contactId: message.ContactId,
                    };

                    try {
                        const result = await sendTwilioSms(text, this.metadata);

                        if (!this.sentTexts[message.ToAddress]) {
                            this.sentTexts[message.ToAddress] = [];
                        }

                        this.sentTexts[message.ToAddress].push(message.CommunicationId);

                        await updateCommunicationMessageStatus(
                            graphUrl,
                            message.CommunicationId,
                            message.ContactId,
                            3,
                            "",
                            result
                        );
                    } catch (err: any) {
                        if (err.code === 21610) {
                            await updateCommunicationMessageStatus(
                                graphUrl,
                                message.CommunicationId,
                                message.ContactId,
                                5,
                                "Recipient's phone number is currently blocking messages from the communication manager."
                            );
                        } else {
                            await updateCommunicationMessageStatus(
                                graphUrl,
                                message.CommunicationId,
                                message.ContactId,
                                9,
                                "Recipient's phone number is encountering an unknown error."
                            );
                        }
                    }
                }
            }
        }
    };
}
