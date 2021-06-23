import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { sendEmails } from "../common/sendEmails";
import dayjs from "dayjs";
import { MailDataRequired } from "@sendgrid/mail";

class SendEmailArgs {
    to?: { name: string; email: string } | { name: string; email: string }[] = [];
    cc?: { name: string; email: string } | { name: string; email: string }[] = [];
    bcc?: { name: string; email: string } | { name: string; email: string }[] = [];
    from: { name: string; email: string } = { name: "", email: "" };
    replyTo?: { name: string; email: string } = { name: "", email: "" };
    sendAt?: number = 0;
    subject?: string = "";
    text?: string = "";
    html?: string = "";
}

export default class SendEmail extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: SendEmailArgs): Promise<any> => {
        try {
            if (!customArgs.text && !customArgs.html) {
                throw new Error("A message is required to send an email.");
            }

            const trackingData: any = {
                clickTracking: {
                    enable: true,
                },
                openTracking: {
                    enable: true,
                },
            };

            if (!customArgs.sendAt || customArgs.sendAt <= 0) {
                customArgs.sendAt = dayjs().unix();
            }

            const messageArg: MailDataRequired = {
                to: customArgs.to,
                from: customArgs.from,
                cc: customArgs.cc,
                bcc: customArgs.bcc,
                replyTo: customArgs.replyTo,
                sendAt: customArgs.sendAt,
                subject: customArgs.subject,
                html: "",
                trackingSettings: trackingData,
            };

            if (customArgs.html) {
                messageArg.html = customArgs.html;
            } else if (customArgs.text && !customArgs.html) {
                messageArg.text = customArgs.text;
                messageArg.html = customArgs.text;
            } else {
                messageArg.text = customArgs.text;
            }

            return { email: await AwaitHelper.execute(sendEmails([messageArg], this.config.metadata)) };
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
