import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";

import { SelectEventsCountResult, selectEventsCount } from "../sql/countEvents";

export async function queryEventsCount(visibility: number): Promise<number> {
    try {
        const graph = GraphService.getSingleton();
        const [[{ total }]] = (await AwaitHelper.execute(
            graph.runCustomSql(selectEventsCount(visibility))
        )) as SelectEventsCountResult[];
        return total;
    } catch (err) {
        throw err;
    }
}
