import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";

export async function queryCdnUrl(photoGuid: string, customGraphRootUrl: string): Promise<string> {
    try {
        const graph = GraphService.getSingleton();
        graph.graphRootUrl = customGraphRootUrl;
        const query = `
			query {
				GetCdnUrl(customArgs: {
					UniqueName: "${photoGuid}"
				})
			}
		`;
        const {
            GetCdnUrl: { url },
        } = await AwaitHelper.execute(graph.runQuery(query));

        return url;
    } catch (err) {
        throw err;
    }
}
