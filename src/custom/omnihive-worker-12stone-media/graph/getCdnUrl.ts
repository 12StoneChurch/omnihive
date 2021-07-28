import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { IImageWorker } from "@12stonechurch/omnihive-worker-common/interfaces/IImageWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";

/**
 * Args:
 *  UniqueName: string
 *  Transformations: cloudinary.TransformationOptions
 */
export default class GetCdnUrl extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any, _omniHiveContext: GraphContext): Promise<any> => {
        try {
            // Validate arguments
            if (!customArgs.UniqueName) {
                throw new Error("A UniqueName is required.");
            }

            const imageWorker: IImageWorker | undefined = this.getWorker("image");

            if (imageWorker) {
                const results = imageWorker.getMpImageUrl(customArgs.UniqueName, customArgs.Transformations);
                return { url: results };
            }

            return "";
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
