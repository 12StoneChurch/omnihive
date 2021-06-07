import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";

import type { Page } from "../../types/Page";
import { SelectEventsListResult, selectEventsList } from "../sql/listEvents";
import { SelectEventTagResult, selectEventTags } from "../sql/selectEventTags";

export const listEvents = async (page: number = 1, perPage: number = 20): Promise<Page<any>> => {
    const graph = GraphService.getSingleton();

    const [events] = (await AwaitHelper.execute(
        graph.runCustomSql(selectEventsList(page, perPage))
    )) as SelectEventsListResult[];

    const mappedEvents = await Promise.all(
        events.map(async (event) => {
            const eventTagQuery = selectEventTags(event.id);
            const [tags] = (await AwaitHelper.execute(graph.runCustomSql(eventTagQuery))) as SelectEventTagResult;

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
                    event.address_id && event.address_line_1 && event.city && event.state && event.postal_code
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

    // TODO: get total count to calculate whether next page exists
    return {
        page: page,
        nextPage: page + 1,
        previousPage: page - 1 > 0 ? page - 1 : undefined,
        items: mappedEvents,
    };
};
