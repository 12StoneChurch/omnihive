import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { IImageWorker } from "@12stonechurch/omnihive-worker-common/interfaces/IImageWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";

/**
 * Args:
 *
 *  searchExpression: string
 *  sortBy: {key: string, orderBy: "asc" | "desc"}
 *  maxResults: number
 *  nextCursor: string
 *  withFields: string
 *  aggregate: string
 *
 */
export default class ImageSearch extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any, _omniHiveContext: GraphContext): Promise<any> => {
        try {
            // Validate arguments
            if (!customArgs.searchExpression) {
                throw new Error("A searchExpression is required.");
            }

            const imageWorker: IImageWorker | undefined = this.getWorker("image");

            if (imageWorker) {
                const results = await imageWorker.search(
                    customArgs.searchExpression,
                    customArgs.sortBy,
                    customArgs.maxResults,
                    customArgs.nextCursor,
                    customArgs.withFields,
                    customArgs.aggregate
                );
                return { results };
            }

            return { results: "No results found" };
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
