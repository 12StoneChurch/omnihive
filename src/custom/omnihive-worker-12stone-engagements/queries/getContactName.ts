import { Knex } from "knex";

export const getContactName = async (knex: Knex, contactId: number): Promise<string> => {
    const res = (await knex
        .first(["c.nickname", "c.last_name"])
        .from("contacts as c")
        .where("c.contact_id", contactId)) as { nickname: string; last_name: string };

    return `${res.nickname} ${res.last_name}`;
};
