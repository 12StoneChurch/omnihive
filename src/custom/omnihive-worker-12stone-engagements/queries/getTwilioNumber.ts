import { Knex } from "knex";

export const getTwilioNumberOld = (connection: Knex, shortcode: boolean = false) => {
    const builder = connection.queryBuilder();
    const configId = shortcode ? 2 : 1;
    builder.select("Default_Number").from("Tenant_Twilio_Configurations").where("Twilio_Configuration_ID", configId);
    return builder;
};

export const getTwilioNumber = (connection: Knex, environment: "Production" | "Beta" | "Development") => {
    // environment should come from metadata set in the custom function settings
    const builder = connection.queryBuilder();
    builder
        .select("ttc.Default_Number")
        .from("Tenant_Application_Configurations as tac")
        .innerJoin("Tenant_Twilio_Configurations as ttc", "ttc.Twilio_Configuration_ID", "tac.Twilio_Configuration_ID")
        .where("tac.Application_ID", 18)
        .andWhere("tac.Configuration_Key", environment);
    return builder;
};