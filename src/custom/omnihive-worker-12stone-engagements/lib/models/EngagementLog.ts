export interface EngagementLogModel {
    id: number;
    engagementId: number;
    description?: string;
    type: {
        id: number;
        name: string;
    };
    dateCreated: Date;
}
