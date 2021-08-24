import { Knex } from "knex";

export const getEngagementByIdQuery = (connection: Knex, engagementId: number) => {
    const builder = connection.queryBuilder();

    builder
        .select(
            "e.Engagement_ID",
            "e.Description",
            "e.Date_Created",
            "e.Contact_ID",
            "c.Nickname as Contact_First_Name",
            "c.Last_Name as Contact_Last_Name",
            "e.Owner_Contact_ID",
            "c2.Nickname as Owner_First_Name",
            "c2.Last_Name as Owner_Last_Name",
            "e.Congregation_ID as Campus_ID",
            "cong.Congregation_Name as Campus",
            "e.Engagement_Type_ID",
            "et.Name as Type",
            "e.Engagement_Status_ID",
            "es.Name as Status"
        )
        .select(
            connection.raw(
                "(select max(Date_Created) from Engagement_Log as el where el.Engagement_ID = e.Engagement_ID group by el.Engagement_ID) as Latest_Activity"
            )
        )
        .from({ e: "Engagements" })
        .innerJoin("contacts as c", "c.Contact_ID", "e.Contact_ID")
        .innerJoin("contacts as c2", "c2.Contact_ID", "e.Owner_Contact_ID")
        .innerJoin("congregations as cong", "cong.Congregation_ID", "e.Congregation_ID")
        .innerJoin("Engagement_Types as et", "et.Engagement_Type_ID", "e.Engagement_Type_ID")
        .innerJoin("Engagement_Statuses as es", "es.Engagement_Status_ID", "e.Engagement_Status_ID")
        .where({ Engagement_ID: engagementId });

    return builder;
};
