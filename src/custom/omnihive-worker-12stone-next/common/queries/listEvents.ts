import type { EventType } from "../../types/Event";
import type { Page } from "../../types/Page";
import { mapEventsList } from "../helpers/mapEventsList";
import { paginatedItemsResult } from "../helpers/paginatedItemsResult";
import { queryEventsCount } from "./queryEventsCount";
import { queryEventsList } from "./queryEventsList";

export async function listEvents(
    page: number = 1,
    perPage: number = 20,
    visibility: number = 4
): Promise<Page<EventType>> {
    return await Promise.all([
        queryEventsCount(visibility),
        new Promise<EventType[]>(async (resolve, reject) => {
            try {
                const events = await queryEventsList(page, perPage, visibility);

                const mappedEvents = await mapEventsList(events);

                resolve(mappedEvents);
            } catch (err) {
                reject(err);
            }
        }),
    ])
        .then(([total, items]) => {
            return paginatedItemsResult(items, page, total, perPage);
        })
        .catch((err) => {
            throw err;
        });
}
