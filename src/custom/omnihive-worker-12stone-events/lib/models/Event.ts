export type Event = {
    eventId: number;
    title: string;
    description: string;
    startDateTime: Date;
    endDateTime: Date;
    featuredImageUrl: string;
    spotsAvailable: number;
    participantsExpected: number;
    childcareAvailable: boolean;
    guestsAllowed: boolean;
    congregation: {
        id: number;
        name: string;
    };
    ageRange: {
        id: number;
        name: string;
    };
    eventTags: {
        id: number;
        name: string;
    }[];
    primaryContact: {
        firstName: string;
        lastName: string;
        emailAddress: string;
    };
    address: {
        addressLine1: string;
        addressLine2: string;
        city: string;
        state: string;
        postalCode: string;
    };
    leaders: {
        contactId: number;
        participantId: number;
        eventParticpantId: number;
        firstName: string;
        lastName: string;
    }[];
    eventParticipant?: {
        id: number;
        status: string;
    };
    score?: number;
};
