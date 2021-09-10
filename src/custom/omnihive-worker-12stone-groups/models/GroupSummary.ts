export type MeetingDay = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export interface GroupLeaderSummary {
    contactId: number;
    firstName: string;
    lastName: string;
}

export interface BaseGroupSummary {
    groupId: number;
    name: string;
    day?: {
        id: number;
        name: string;
    };
    time?: string;
    totalParticipants: number;
}

export interface GroupSummary extends BaseGroupSummary {
    leaders: GroupLeaderSummary[];
}
