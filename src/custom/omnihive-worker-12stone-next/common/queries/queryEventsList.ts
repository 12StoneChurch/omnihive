import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";

import { SelectEventsListResult, selectEventsList } from "../sql/listEvents";
import { selectRegisteredUserEventsList } from "../sql/listRegisteredUserEvents";
import { SelectUserEventsListResult, selectUserEventsList } from "../sql/listUserEvents";

export async function queryEventsList(
    page: number,
    perPage: number,
    visibility: number,
    userId?: number,
    registered?: boolean
): Promise<SelectEventsListResult | SelectUserEventsListResult> {
    try {
        const graph = GraphService.getSingleton();

        if (userId) {
            if (registered) {
                const [userEvents] = (await AwaitHelper.execute(
                    graph.runCustomSql(selectRegisteredUserEventsList(page, perPage, userId, visibility))
                )) as SelectUserEventsListResult[];
                return userEvents;
            }

            const [userEvents] = (await AwaitHelper.execute(
                graph.runCustomSql(selectUserEventsList(page, perPage, userId, visibility))
            )) as SelectUserEventsListResult[];
            return userEvents;
        }

        const [events] = (await AwaitHelper.execute(
            graph.runCustomSql(selectEventsList(page, perPage, visibility))
        )) as SelectEventsListResult[];
        return events;
    } catch (err) {
        throw err;
    }
}
