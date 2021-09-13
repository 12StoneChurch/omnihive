export interface BaseGroupMemberSummary {
    contactId: number;
    participantId: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    startDate: string;
    isLeader: boolean;
    photoGuid?: string;
}

export interface GroupMemberSummary extends BaseGroupMemberSummary {
    photoUrl?: string;
}
