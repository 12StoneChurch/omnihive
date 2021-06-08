import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";

import { SelectEventsListResult, selectEventsList } from "../sql/listEvents";

export async function queryEventsList(
    page: number,
    perPage: number,
    visibility: number
): Promise<SelectEventsListResult> {
    try {
        const graph = GraphService.getSingleton();
        const [events] = (await AwaitHelper.execute(
            graph.runCustomSql(selectEventsList(page, perPage, visibility))
        )) as SelectEventsListResult[];
        return events;
    } catch (err) {
        throw err;
    }
}
