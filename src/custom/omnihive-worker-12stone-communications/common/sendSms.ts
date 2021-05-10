import twilio, { Twilio } from "twilio";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { serializeError } from "serialize-error";

export const sendSms = async (
    texts: any,
    metadata: any
): Promise<{
    sent: { id: number; contactId: number; sid: string }[];
    errors: { id: number; contactId: number; sid: string }[];
}> => {
    const client: Twilio = twilio(metadata.twilioSid, metadata.twilioAuth);
    const errors: { id: number; contactId: number; sid: string }[] = [];
    const sent: { id: number; contactId: number; sid: string }[] = [];

    for (const text of texts) {
        const idObject: { id: number; contactId: number } = { id: text.id, contactId: text.contactId };

        try {
            const response = await AwaitHelper.execute(client.messages.create(text.data));
            sent.push({ ...idObject, sid: response.sid });
        } catch (err) {
            errors.push({ ...idObject, sid: "" });
            console.log(JSON.stringify(serializeError(err)));
        }
    }

    return {
        sent,
        errors,
    };
};
