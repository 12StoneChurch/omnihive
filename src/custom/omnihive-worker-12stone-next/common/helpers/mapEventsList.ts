import { EventType } from "../../types/Event";
import { queryEventTags } from "../queries/queryEventTags";
import { SelectEventsListResult } from "../sql/listEvents";
import { SelectUserEventsListResult } from "../sql/listUserEvents";

export async function mapEventsList(
    eventsResults: SelectEventsListResult | SelectUserEventsListResult
): Promise<EventType[]> {
    return await Promise.all(
        eventsResults.map(async (eventResult) => {
            const tags = await queryEventTags(eventResult.id);

            return {
                id: eventResult.id,
                title: eventResult.title,
                description: eventResult.description ?? undefined,
                img_url: eventResult.img_url ?? undefined,
                date: { start: eventResult.start_date, end: eventResult.end_date },
                type: {
                    id: eventResult.type_id,
                    name: eventResult.type,
                },
                campus: {
                    id: eventResult.campus_id,
                    name: eventResult.campus,
                },
                address:
                    eventResult.address_id &&
                    eventResult.address_line_1 &&
                    eventResult.city &&
                    eventResult.state &&
                    eventResult.postal_code
                        ? {
                              id: eventResult.address_id,
                              address_line_1: eventResult.address_line_1,
                              address_line_2: eventResult.address_line_2 ?? undefined,
                              city: eventResult.city,
                              state: eventResult.state,
                              postal_code: eventResult.postal_code,
                          }
                        : undefined,
                capacity: {
                    guests_allowed: eventResult.guests_allowed ?? undefined,
                    participants_expected: eventResult.participants_expected ?? undefined,
                    participants_registered: eventResult.participants_registered,
                    spots_available: eventResult.spots_available ?? undefined,
                },
                age_range:
                    eventResult.age_range_id && eventResult.age_range
                        ? {
                              id: eventResult.age_range_id,
                              name: eventResult.age_range,
                          }
                        : undefined,
                childcare: {
                    available: eventResult.childcare_available ?? false,
                    capacity: eventResult.childcare_capacity ?? undefined,
                    age_min: eventResult.childcare_age_min ?? undefined,
                    age_max: eventResult.childcare_age_max ?? undefined,
                },
                primary_contact: {
                    id: eventResult.primary_contact_id,
                    first_name: eventResult.primary_contact_first_name ?? undefined,
                    last_name: eventResult.primary_contact_last_name ?? undefined,
                    email: eventResult.primary_contact_email,
                },
                tags,
                participation:
                    eventResult.participation_status && eventResult.participation_status_id
                        ? {
                              id: eventResult.participation_status_id,
                              name: eventResult.participation_status.substring(3),
                          }
                        : undefined,
            };
        })
    );
}
