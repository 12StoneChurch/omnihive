import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { danyPost } from "@12stonechurch/omnihive-worker-common/helpers/DanyHelper";
import { DanyService } from "@12stonechurch/omnihive-worker-common/services/DanyService";
import { TrackEvent } from "../models/TrackEvent";

class Args {
    Event: TrackEvent | undefined;
}

export default class Track extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any): Promise<any> => {
        try {
            // Get Metadata
            DanyService.getSingleton().setMetaData(this.config.metadata);

            // Validate arguments
            this.checkObjectStructure(Args, customArgs);

            const result = await AwaitHelper.execute(
                danyPost(`/Analytics/Profile/${customArgs.DistinctId}`, customArgs.Event)
            );

            return { url: result.data };
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
