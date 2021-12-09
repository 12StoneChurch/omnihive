import sgMail from "@sendgrid/mail";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { MailDataRequired } from "@sendgrid/mail";

export const sendEmails = async (data: MailDataRequired[], metadata: any): Promise<void> => {
    sgMail.setApiKey(metadata.sendGridKey);
    await AwaitHelper.execute(sgMail.send(data));
};
