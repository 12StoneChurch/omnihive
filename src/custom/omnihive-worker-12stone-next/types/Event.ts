import type { EventTag } from "./EventTag";

interface GenericRef {
    id: number;
    name: string;
}

type EventAgeRangeRef = GenericRef;
type EventCampusRef = GenericRef;
type EventTypeRef = GenericRef;

type EventDate = {
    start: string;
    end: string;
};

type EventAddressRef = {
    id: number;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
};

type EventPrimaryContactRef = {
    id: number;
    first_name?: string;
    last_name?: string;
    email: string;
};

type EventChildcare = {
    available: boolean;
    capacity?: number;
    age_min?: number;
    age_max?: number;
};

type EventCapacity = {
    guests_allowed?: boolean;
    participants_expected?: number;
    participants_registered: number;
    spots_available?: number;
};

export type EventType = {
    id: number;
    title: string;
    description?: string;
    img_url?: string;
    date: EventDate;
    type: EventTypeRef;
    campus: EventCampusRef;
    address?: EventAddressRef;
    capacity: EventCapacity;
    age_range?: EventAgeRangeRef;
    childcare: EventChildcare;
    primary_contact: EventPrimaryContactRef;
    tags: EventTag[];
};
