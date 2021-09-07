export interface AttendanceRecord {
    groupId: number;
    eventId: number;
    date: string;
    participants: number[];
    anonCount: number;
    childCount: number;
    feedback?: string;
}
