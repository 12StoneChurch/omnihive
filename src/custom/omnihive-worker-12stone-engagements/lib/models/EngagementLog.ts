export interface EngagementLogModel {
    engagementLogId: number;
    engagementId: number;
    description?: string;
    type: {
        id: number;
        name: string;
    };
    dateCreated: Date;
    source: "EngagementLog";
}

export interface EngagementContactLogModel {
    engagementContactLogId: number;
    engagementId: number;
    description: string;
    type?: undefined;
    dateCreated: Date;
    source: "EngagementContactLog";
}

export type EngagementLogOrEngagementContactLogModel = EngagementLogModel | EngagementContactLogModel;
