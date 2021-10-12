export interface ContactModel {
    id: number;
    userId?: number;
    participantId?: number;
    firstName: string;
    lastName: string;
    displayName: string;
    nickname: string;
    email: string;
    phone?: string;
    age?: number;
    dateOfBirth?: string;
    address?: {
        line1: string;
        line2?: string;
        city?: string;
        state?: string;
        zip?: string;
    };
    campus: {
        id: number;
        name: string;
    };
    household: {
        id: number;
        positionId?: number;
        position?: string;
    };
    photoUrl?: string;
}
