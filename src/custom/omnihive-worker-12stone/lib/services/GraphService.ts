import { OmniHiveClient } from "@withonevision/omnihive-client";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { serializeError } from "serialize-error";

export class GraphService {
    public graphRootUrl: string = "";

    private static singleton: GraphService;

    public static getSingleton = (): GraphService => {
        if (!GraphService.singleton) {
            GraphService.singleton = new GraphService();
        }

        return GraphService.singleton;
    };

    public runQuery = async (query: string): Promise<any> => {
        try {
            if (!query) {
                throw new Error("A query is required.");
            }

            const results = await AwaitHelper.execute(
                OmniHiveClient.getSingleton().graphClient(this.graphRootUrl, query)
            );
            return results;
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };
}
