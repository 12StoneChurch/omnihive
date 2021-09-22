export type MeetingDay = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
export type GroupStatus = "Open for Signup" | "Full" | "Private" | "Closed";

export interface GroupLeaderSummary {
    contactId: number;
    firstName: string;
    lastName: string;
}

export interface BaseGroupSummary {
    groupId: number;
    name: string;
    day?: {
        meetingDayId: number;
        name: string;
    };
    time?: string;
    totalParticipants: number;
}

export interface GroupSummary extends BaseGroupSummary {
    leaders: GroupLeaderSummary[];
    imgUrl?: string;
}

export interface BaseGroupDetail extends BaseGroupSummary {
    lastMeetingDate?: string;
    status: {
        statusId: number;
        name: GroupStatus;
    };
    coach?: {
        contactId: number;
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
    };
}

export interface GroupDetail extends BaseGroupDetail {
    leaders: GroupLeaderSummary[];
    imgUrl?: string;
}
