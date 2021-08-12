import dayjs from "dayjs";
import { Knex } from "knex";

interface Args {
    engagementId: number;
    description?: string;
    typeId: number;
}

export const selectInsertedEngagementLogQuery = (connection: Knex, id: number) => {
    const builder = connection.queryBuilder();
    builder
        .select("el.*", "elt.Name as Engagement_Log_Type_Name", "es.Name as Engagement_Status_Name")
        .from({ el: "Engagement_Log" })
        .innerJoin("Engagement_Log_Types as elt", "el.Engagement_Log_Type_ID", "elt.Engagement_Log_Type_ID")
        .leftJoin("Engagements as e", "el.Engagement_ID", "el.Engagement_ID")
        .leftJoin("Engagement_Statuses as es", "e.Engagement_Status_ID", "es.Engagement_Status_ID")
        .where({ Engagement_Log_ID: id });

    return builder;
};

export const insertEngagementLogQuery = (connection: Knex, data: Args) => {
    const { engagementId, description, typeId } = data;

    const builder = connection.queryBuilder();
    builder
        .insert({
            Engagement_ID: engagementId,
            Description: description,
            Date_Created: dayjs().toISOString(),
            Engagement_Log_Type_ID: typeId,
            Domain_ID: 1,
        })
        .into("Engagement_Log")
        .returning(["Engagement_Log_ID"]);

    return builder;
};

export const selectEngagementStatuses = (connection: Knex) => {
    const builder = connection.queryBuilder();

    builder.select("Engagement_Status_ID", "Name").from("Engagement_Statuses").where({ Name: "Open" });

    return builder;
};

export const updateEngagementStatusQuery = (connection: Knex, data: Args, statusId: number) => {
    const { engagementId } = data;

    const builder = connection.queryBuilder();

    builder.update({ Engagement_Status_ID: statusId }).from("Engagements").where({ Engagement_ID: engagementId });

    return builder;
};
