import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { danyGet } from "@12stonechurch/omnihive-worker-common/helpers/DanyHelper";
import { DanyService } from "@12stonechurch/omnihive-worker-common/services/DanyService";

export default class ForgotPassword extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any): Promise<any> => {
        try {
            // Get Metadata
            DanyService.getSingleton().setMetaData(this.metadata);

            const result = await AwaitHelper.execute(danyGet("/Users/GetUser", customArgs.authToken));

            return result.data;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
