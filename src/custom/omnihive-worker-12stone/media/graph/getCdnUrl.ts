import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { IImageWorker } from "../../lib/interfaces/IImageWorker";

/**
 * Args:
 *  UniqueName: string
 *  Transformations: cloudinary.TransformationOptions
 */
export default class GetCdnUrl extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any): Promise<any> => {
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
