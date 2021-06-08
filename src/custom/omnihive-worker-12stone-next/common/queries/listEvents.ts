import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";

import { EventType } from "../../types/Event";
import type { Page } from "../../types/Page";
import { SelectEventsCountResult, selectEventsCount } from "../sql/countEvents";
import { SelectEventsListResult, selectEventsList } from "../sql/listEvents";
import { SelectEventTagResult, selectEventTags } from "../sql/selectEventTags";

export const listEvents = async (page: number = 1, perPage: number = 20): Promise<Page<EventType>> => {
    const graph = GraphService.getSingleton();

    return await Promise.all([
        new Promise<number>(async (resolve, reject) => {
            try {
                const [[{ total }]] = (await AwaitHelper.execute(
                    graph.runCustomSql(selectEventsCount())
                )) as SelectEventsCountResult[];
                resolve(total);
            } catch (err) {
                reject(err);
            }
        }),
        new Promise<EventType[]>(async (resolve, reject) => {
            try {
                const [events] = (await AwaitHelper.execute(
                    graph.runCustomSql(selectEventsList(page, perPage))
                )) as SelectEventsListResult[];

                const mappedEvents = await Promise.all(
                    events.map(async (event) => {
                        const eventTagQuery = selectEventTags(event.id);
                        const tags = (await AwaitHelper.execute(
                            graph.runCustomSql(eventTagQuery)
                        )) as SelectEventTagResult;

                        return {
                            id: event.id,
                            title: event.title,
                            description: event.description ?? undefined,
                            img_url: event.img_url ?? undefined,
                            date: { start: event.start_date, end: event.end_date },
                            type: {
                                id: event.type_id,
                                name: event.type,
                            },
                            campus: {
                                id: event.campus_id,
                                name: event.campus,
                            },
                            address:
                                event.address_id &&
                                event.address_line_1 &&
                                event.city &&
                                event.state &&
                                event.postal_code
                                    ? {
                                          id: event.address_id,
                                          address_line_1: event.address_line_1,
                                          address_line_2: event.address_line_2 ?? undefined,
                                          city: event.city,
                                          state: event.state,
                                          postal_code: event.postal_code,
                                      }
                                    : undefined,
                            capacity: {
                                guests_allowed: event.guests_allowed ?? undefined,
                                participants_expected: event.participants_expected ?? undefined,
                                participants_registered: event.participants_registered,
                                spots_available: event.spots_available ?? undefined,
                            },
                            age_range:
                                event.age_range_id && event.age_range
                                    ? {
                                          id: event.age_range_id,
                                          name: event.age_range,
                                      }
                                    : undefined,
                            childcare: {
                                available: event.childcare_available ?? false,
                                capacity: event.childcare_capacity ?? undefined,
                                age_min: event.childcare_age_min ?? undefined,
                                age_max: event.childcare_age_max ?? undefined,
                            },
                            primary_contact: {
                                id: event.primary_contact_id,
                                first_name: event.primary_contact_first_name ?? undefined,
                                last_name: event.primary_contact_last_name ?? undefined,
                                email: event.primary_contact_email,
                            },
                            tags,
                        };
                    })
                );

                resolve(mappedEvents);
            } catch (err) {
                reject(err);
            }
        }),
    ])
        .then(([total_items, items]) => {
            const total_pages = Math.ceil(total_items / perPage);

            const next_page = (function () {
                if (page + 1 < total_pages) return page + 1;
                return undefined;
            })();

            const previous_page = (function () {
                if (page > total_pages) return total_pages;
                if (page - 1 > 0) return page - 1;
                return undefined;
            })();

            return {
                page,
                per_page: perPage,
                total_items,
                total_pages,
                next_page,
                previous_page,
                items,
            };
        })
        .catch((err) => {
            throw err;
        });
};
