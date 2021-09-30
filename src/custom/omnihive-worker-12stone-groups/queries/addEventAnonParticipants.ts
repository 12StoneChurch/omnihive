import { Knex } from "knex";

type InsertEventParticipantsDTO = number[];

interface EventAnonParticipantsAdder {
    (knex: Knex, opts: { eventId: number; participantId: number; anonCount: number }): Promise<number[]>;
}

export const addEventAnonParticipants: EventAnonParticipantsAdder = async (
    knex,
    { eventId, participantId, anonCount }
) => {
    if (anonCount > 0) {
        const participantIds = Array<number>(anonCount).fill(participantId);

        const data = participantIds.map((participantId) => ({
            event_id: eventId,
            participant_id: participantId,
            participation_status_id: 3,
            domain_id: 1,
        }));

        const eventChildParticipantIds = (await knex
            .insert(data)
            .into("event_participants")
            .returning("participant_id")) as InsertEventParticipantsDTO;

        return eventChildParticipantIds;
    }

    return [];
};
