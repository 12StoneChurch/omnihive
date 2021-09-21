export interface NotificationSummary {
    groupId: number;
    contactId: number;
    groupName: string;
    day: {
        meetingDayId: number;
        name: string;
    };
    isToday: boolean;
    phone: string;
}
