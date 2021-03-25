import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { danyGet } from "../../lib/helpers/DanyHelper";
import DanyService from "../../lib/services/DanyService";

class Args {
    UniqueName: string = "";
}

export default class GetCdnUrl extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any): Promise<any> => {
        try {
            // Get Metadata
            DanyService.getSingleton().setMetaData(this.config.metadata);

            // Validate arguments
            this.checkObjectStructure(Args, customArgs);

            const result = await AwaitHelper.execute(danyGet(`/Image/Cdn/${customArgs.UniqueName}`));

            return { url: result.data };
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
