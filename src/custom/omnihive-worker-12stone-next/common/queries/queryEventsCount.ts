import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";

import { SelectEventsCountResult, selectEventsCount } from "../sql/countEvents";
import { selectRegisteredEventsCount, SelectRegisteredEventsCountResult } from "../sql/countRegisteredEvents";

export async function queryEventsCount(visibility: number, userId?: number, registered?: boolean): Promise<number> {
    try {
        const graph = GraphService.getSingleton();

        if (registered && userId) {
            const [[{ total }]] = (await AwaitHelper.execute(
                graph.runCustomSql(selectRegisteredEventsCount(userId, visibility))
            )) as SelectRegisteredEventsCountResult[];
            return total;
        }

        const [[{ total }]] = (await AwaitHelper.execute(
            graph.runCustomSql(selectEventsCount(visibility))
        )) as SelectEventsCountResult[];
        return total;
    } catch (err) {
        throw err;
    }
}
