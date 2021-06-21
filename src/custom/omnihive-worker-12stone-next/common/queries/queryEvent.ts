import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";

import { SelectEventResult, selectEvent } from "../sql/selectEvent";
import { SelectUserEventResult, selectUserEvent } from "../sql/selectUserEvent";

export async function queryEvent(eventId: number, userId?: number): Promise<SelectEventResult | SelectUserEventResult> {
    try {
        const graph = GraphService.getSingleton();

        if (userId) {
            const eventQuery = selectUserEvent(eventId, userId);
            const [userEvents] = (await AwaitHelper.execute(graph.runCustomSql(eventQuery))) as SelectUserEventResult[];
            return userEvents;
        }

        const eventQuery = selectEvent(eventId);
        const [events] = (await AwaitHelper.execute(graph.runCustomSql(eventQuery))) as SelectEventResult[];
        return events;
    } catch (err) {
        throw err;
    }
}
