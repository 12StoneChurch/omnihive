import dayjs from "dayjs";
import { Knex } from "knex";

interface ParticipantRecordAdder {
    (knex: Knex, opts: { contactId: number }): Promise<number>;
}

export const addParticipantRecord: ParticipantRecordAdder = async (knex, { contactId }) => {
    const [participantId] = await knex
        .insert({ contact_id: contactId, participant_start_date: dayjs().toISOString(), domain_id: 1 })
        .into("participants")
        .returning<number[]>(["participant_id"]);

    return participantId;
};
