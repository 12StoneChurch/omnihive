import twilio, { Twilio } from "twilio";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";

export const sendTwilioSms = async (text: any, metadata: any): Promise<string> => {
    const client: Twilio = twilio(metadata.twilioSid, metadata.twilioAuth);

    try {
        const response = await AwaitHelper.execute(client.messages.create(text.data));
        return response.sid;
    } catch (err) {
        throw err;
    }
};
