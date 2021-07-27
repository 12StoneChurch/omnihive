import { Knex } from "knex";

export const getTwilioNumber = (connection: Knex, shortcode: boolean = false) => {
    const builder = connection.queryBuilder();
    const configId = shortcode ? 2 : 1;
    builder.select("Default_Number").from("Tenant_Twilio_Configurations").where("Twilio_Configuration_ID", configId);
    return builder;
};
