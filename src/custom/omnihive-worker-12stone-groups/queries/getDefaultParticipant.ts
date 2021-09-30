import { Knex } from "knex";

type SelectContactsDTO = { participant_record: number };

interface DefaultParticipantGetter {
    (knex: Knex): Promise<number>;
}

export const getDefaultParticipant: DefaultParticipantGetter = async (knex) => {
    const { participant_record } = (await knex
        .first(["participant_record"])
        .from("contacts")
        .where("contact_id", 1)) as SelectContactsDTO;

    return participant_record;
};
