import { Knex } from "knex";

export const getTwilioNumber = async (knex: Knex, env: string) => {
    // environment should come from metadata set in the custom function settings
    const envCapitalized = env.charAt(0).toUpperCase() + env.slice(1);

    const { default_number } = await knex
        .first("ttc.default_number")
        .from("Tenant_Application_Configurations as tac")
        .innerJoin("Tenant_Twilio_Configurations as ttc", "ttc.Twilio_Configuration_ID", "tac.Twilio_Configuration_ID")
        .where("tac.Application_ID", 18)
        .andWhere("tac.Configuration_Key", envCapitalized);

    return default_number;
};
