import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";

import { SelectEventTagResult, selectEventTags } from "../sql/selectEventTags";

export async function queryEventTags(id: number): Promise<SelectEventTagResult> {
    try {
        const graph = GraphService.getSingleton();
        const eventTagQuery = selectEventTags(id);
        const [tags] = (await AwaitHelper.execute(graph.runCustomSql(eventTagQuery))) as SelectEventTagResult[];
        return tags;
    } catch (err) {
        throw err;
    }
}
