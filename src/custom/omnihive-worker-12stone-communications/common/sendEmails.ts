import sgMail from "@sendgrid/mail";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { serializeError } from "serialize-error";
import { MailDataRequired } from "@sendgrid/mail";

export const sendEmails = async (data: MailDataRequired[], metadata: any): Promise<void> => {
    sgMail.setApiKey(metadata.sendGridKey);

    try {
        await AwaitHelper.execute(sgMail.send(data));
    } catch (err) {
        console.log(JSON.stringify(serializeError(err)));
    }
};
