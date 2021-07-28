export interface ContactAlertModel {
    contactLogId: number;
    contactId: number;
    description: string;
    dateCreated: Date;
    createdBy: {
        contactId: number;
        firstName?: string;
        lastName?: string;
    };
}
