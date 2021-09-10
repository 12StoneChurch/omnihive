import dayjs from "dayjs";
import { Knex } from "knex";

type InsertParticipantsDTO = number[];

interface ParticipantRecordAdder {
    (knex: Knex, opts: { contactId: number }): Promise<number>;
}

export const addParticipantRecord: ParticipantRecordAdder = async (knex, { contactId }) => {
    const [participantId] = (await knex
        .insert({ contact_id: contactId, participant_start_date: dayjs().toISOString(), domain_id: 1 })
        .into("participants")
        .returning(["participant_id"])) as InsertParticipantsDTO;

    return participantId;
};
