import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";

import { SelectEventResult, selectEvent } from "../sql/selectEvent";

export async function queryEvent(id: number): Promise<SelectEventResult> {
    if (!id) throw new Error(`"id" parameter missing in "queryEventTags" function`);
    try {
        const graph = GraphService.getSingleton();
        const eventQuery = selectEvent(id);
        const [events] = (await AwaitHelper.execute(graph.runCustomSql(eventQuery))) as SelectEventResult[];
        return events;
    } catch (err) {
        throw err;
    }
}
