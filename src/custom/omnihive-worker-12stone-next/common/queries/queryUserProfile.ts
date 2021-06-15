import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";

import { SelectUserProfileResult, selectUserProfile } from "../sql/selectUserProfile";

export async function queryUserProfile(id: number, mpGraphRootUrl: string): Promise<SelectUserProfileResult> {
    if (!id) throw new Error(`"id" parameter missing in "queryUserProfile" function`);
    try {
        const graph = GraphService.getSingleton();
        graph.graphRootUrl = mpGraphRootUrl;
        const userProfileQuery = selectUserProfile(id);
        const [user] = (await AwaitHelper.execute(graph.runCustomSql(userProfileQuery))) as SelectUserProfileResult[];
        return user;
    } catch (err) {
        throw err;
    }
}
