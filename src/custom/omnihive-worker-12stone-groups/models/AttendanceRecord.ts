import { GroupMemberSummary } from "./GroupMember";

export interface AttendanceRecordSummary {
    groupId: number;
    eventId: number;
    date: string;
    memberCount: number;
    anonCount: number;
    childCount: number;
    totalCount: number;
    meetingOccurred: boolean;
    feedback?: string;
}

export interface AttendanceRecordDetail extends AttendanceRecordSummary {
    members: GroupMemberSummary[];
}
