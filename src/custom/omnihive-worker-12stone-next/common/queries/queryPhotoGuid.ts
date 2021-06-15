import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";

export async function queryPhotoGuid(contactId: number, mpGraphRootUrl: string): Promise<string> {
    if (!contactId) throw new Error(`"contactId" parameter missing in "queryUserProfile" function`);
    try {
        const graph = GraphService.getSingleton();
        graph.graphRootUrl = mpGraphRootUrl;
        const query = `
			query {
				dpFiles(pageId: "=292", defaultImage: "=1", recordId: "=${contactId}") {
					uniqueName
				}
			}
		`;
        const { dpFiles } = await AwaitHelper.execute(graph.runQuery(query));
        const photoGuid = dpFiles[0].uniqueName;
        return photoGuid;
    } catch (err) {
        throw err;
    }
}
