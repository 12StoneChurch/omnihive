import { Knex } from "knex";

export const getPhoneByContactId = (connection: Knex, ownerId: number) => {
    const builder = connection.queryBuilder();
    builder.select("Mobile_Phone").from("Contacts").where("Contact_ID", ownerId);
    return builder;
};
