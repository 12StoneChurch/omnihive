export interface EngagementModel {
    engagementId: number;
    description: string;
    dateCreated: Date;
    contact: {
        contactId: number;
        firstName: string;
        lastName: string;
    };
    owner: {
        contactId: number;
        firstName: string;
        lastName: string;
    };
    campus: {
        id: number;
        name: string;
    };
    type: {
        id: number;
        name: string;
    };
    status: {
        id: number;
        name: string;
    };
    latestActivity?: Date;
    history?: {
        contactLogCount: number;
        engagementLogCount: number;
    };
}
