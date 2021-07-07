import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { danyPost } from "@12stonechurch/omnihive-worker-common/helpers/DanyHelper";
import { DanyService } from "@12stonechurch/omnihive-worker-common/services/DanyService";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";

export default class ForgotPassword extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any, _omniHiveContext: GraphContext): Promise<any> => {
        try {
            // Get Metadata
            DanyService.getSingleton().setMetaData(this.metadata);

            const result = await AwaitHelper.execute(danyPost("/Security/ForgotPassword", customArgs));

            return result.data;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
