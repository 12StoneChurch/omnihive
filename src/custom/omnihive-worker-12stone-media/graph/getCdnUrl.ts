import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { getImageUrl } from "../common/getImageUrl";

/**
 * Args:
 *  UniqueName: string
 *  Transformations: cloudinary.TransformationOptions
 */
export default class GetCdnUrl extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any, _omniHiveContext: GraphContext): Promise<any> => {
        // Validate arguments
        if (!customArgs.UniqueName) {
            throw new Error("A UniqueName is required.");
        }

        return getImageUrl(this, customArgs.UniqueName, customArgs.Transformations);
    };
}
