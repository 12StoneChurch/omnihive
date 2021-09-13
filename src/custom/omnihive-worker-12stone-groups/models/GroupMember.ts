export interface BaseFamilyMemberSummary {
    contactId: number;
    firstName: string;
    lastName: string;
    age?: number;
    photoGuid?: string;
}

export interface FamilyMemberSummary extends BaseFamilyMemberSummary {
    photoUrl?: string;
}

export interface BaseGroupMemberSummary {
    contactId: number;
    participantId: number;
    householdId: number;
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

export interface BaseGroupMemberDetail extends BaseGroupMemberSummary {
    gender?: string;
    age?: number;
    family: BaseFamilyMemberSummary[];
}

export interface GroupMemberDetail {
    family: FamilyMemberSummary[];
    photoUrl?: string;
}
