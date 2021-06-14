import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { sendTwilioSms } from "../common/sendTwilioSms";

class SendSmsArgs {
    body: string = "";
    from: string = "";
    mediaUrl: string | string[] = [];
    to: string = "";
    commId: number = 0;
    contactId: number = 0;
}

export default class SendSms extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: SendSmsArgs): Promise<any> => {
        try {
            const messageArg = {
                id: customArgs.commId,
                contactId: customArgs.contactId,
                data: {
                    body: customArgs.body,
                    from: customArgs.from,
                    to: customArgs.to,
                    mediaUrl: customArgs.mediaUrl,
                },
            };
            return { sid: await AwaitHelper.execute(sendTwilioSms(messageArg, this.config.metadata)) };
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
