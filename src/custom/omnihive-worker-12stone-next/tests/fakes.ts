import { SelectEventsCountResult } from "../common/sql/countEvents";
import { SelectEventsListResult } from "../common/sql/listEvents";
import { SelectEventResult } from "../common/sql/selectEvent";
import { SelectEventTagResult } from "../common/sql/selectEventTags";
import { EventType } from "../types/Event";

export const fakeSelectEventResult: SelectEventResult = [
    {
        id: 1,
        title: "Fake Title",
        description: null,
        img_url: null,
        start_date: "Fake Start Date",
        end_date: "Fake End Date",
        type_id: 1,
        type: "Fake Type",
        campus_id: 1,
        campus: "Fake Campus",
        address_id: 1,
        address_line_1: "Fake Address Line 1",
        address_line_2: null,
        city: null,
        state: null,
        postal_code: null,
        age_range_id: null,
        age_range: null,
        childcare_available: null,
        childcare_capacity: null,
        childcare_age_min: null,
        childcare_age_max: null,
        primary_contact_id: 1,
        primary_contact_first_name: null,
        primary_contact_last_name: null,
        primary_contact_email: "Fake Email",
        guests_allowed: null,
        participants_expected: null,
        participants_registered: 1,
        spots_available: null,
    },
];

export const fakeSelectEventTagsResult: SelectEventTagResult = [{ id: 1, tag: "Fake Tag" }];

export const fakeSelectEventsListResult: SelectEventsListResult = fakeSelectEventResult;

export const fakeSelectEventsCountResult: SelectEventsCountResult = [{ total: 1 }];

export const fakeEvent: EventType = {
    id: 1,
    title: "Fake Title",
    description: undefined,
    img_url: undefined,
    date: {
        start: "Fake Start Date",
        end: "Fake End Date",
    },
    type: {
        id: 1,
        name: "Fake Type",
    },
    campus: {
        id: 1,
        name: "Fake Campus",
    },
    address: undefined,
    capacity: {
        guests_allowed: undefined,
        participants_expected: undefined,
        participants_registered: 1,
        spots_available: undefined,
    },
    age_range: undefined,
    childcare: {
        available: false,
        capacity: undefined,
        age_min: undefined,
        age_max: undefined,
    },
    primary_contact: {
        id: 1,
        first_name: undefined,
        last_name: undefined,
        email: "Fake Email",
    },
    tags: [{ id: 1, tag: "Fake Tag" }],
};
