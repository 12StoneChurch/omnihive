import type { EventType } from "../../types/Event";
import type { SelectEventResult } from "../sql/selectEvent";
import type { SelectEventTagResult } from "../sql/selectEventTags";
import { SelectUserEventResult } from "../sql/selectUserEvent";

export function mapEvent(tags: SelectEventTagResult, events: SelectEventResult | SelectUserEventResult): EventType[] {
    return events.map((event) => ({
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
        participation:
            event.participation_status && event.participation_status_id
                ? {
                      id: event.participation_status_id,
                      name: event.participation_status.substring(3),
                  }
                : undefined,
    }));
}
