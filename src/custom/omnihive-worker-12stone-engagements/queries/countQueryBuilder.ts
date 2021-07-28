import { Knex } from "knex";

interface Args {
    page?: number;
    perPage?: number;
    contactId?: number;
    ownerId?: number;
    statusId?: number[];
    congregationId?: number;
    typeId?: number;
}

export const countQueryBuilder = (connection: Knex<any | unknown>, customArgs: Args) => {
    const builder = connection.queryBuilder();
    builder
        // .distinct("e.Engagement_ID")
        .countDistinct("e.Engagement_ID as count")
        .from({ e: "Engagements" })
        .innerJoin("contacts as c", "c.Contact_ID", "e.Contact_ID")
        .innerJoin("contacts as c2", "c2.Contact_ID", "e.Owner_Contact_ID")
        .innerJoin("congregations as cong", "cong.Congregation_ID", "e.Congregation_ID")
        .innerJoin("Engagement_Types as et", "et.Engagement_Type_ID", "e.Engagement_Type_ID")
        .innerJoin("Engagement_Statuses as es", "es.Engagement_Status_ID", "e.Engagement_Status_ID");

    // Adds filtering based on custom args
    if (customArgs?.contactId) {
        builder.where("e.Contact_ID", customArgs.contactId);
    }
    if (customArgs?.ownerId) {
        builder.where("e.Owner_Contact_ID", customArgs.ownerId);
    }
    if (customArgs?.congregationId) {
        builder.where("e.Congregation_ID", customArgs.congregationId);
    }
    if (customArgs?.statusId) {
        builder.whereIn("e.Engagement_Status_ID", customArgs.statusId);
    }
    if (customArgs?.typeId) {
        builder.where("e.Engagement_Type_ID", customArgs.typeId);
    }

    return builder;
};
