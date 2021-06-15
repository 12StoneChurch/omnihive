import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";

import { SelectUserProfileResult, selectUserProfile } from "../sql/selectUserProfile";

export async function queryUserProfile(id: number): Promise<SelectUserProfileResult> {
    if (!id) throw new Error(`"id" parameter missing in "queryUserProfile" function`);
    try {
        const graph = GraphService.getSingleton();
        const userProfileQuery = selectUserProfile(id);
        const [user] = (await AwaitHelper.execute(graph.runCustomSql(userProfileQuery))) as SelectUserProfileResult[];
        return user;
    } catch (err) {
        throw err;
    }
}
