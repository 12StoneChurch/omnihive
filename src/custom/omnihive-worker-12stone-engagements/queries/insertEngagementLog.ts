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
        .select("el.*", "elt.Name as Engagement_Log_Type_Name")
        .from({ el: "Engagement_Log" })
        .innerJoin("Engagement_Log_Types as elt", "el.Engagement_Log_Type_ID", "elt.Engagement_Log_Type_ID")
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
