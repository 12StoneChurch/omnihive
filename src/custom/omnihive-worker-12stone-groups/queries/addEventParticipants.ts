import { Knex } from "knex";

type InsertEventParticipantsDTO = number[];

interface EventParticipantsAdder {
    (knex: Knex, opts: { eventId: number; participantIds: number[] }): Promise<number[]>;
}

export const addEventParticipants: EventParticipantsAdder = async (knex, { eventId, participantIds }) => {
    if (participantIds.length) {
        const data = participantIds.map((participantId) => ({
            event_id: eventId,
            participant_id: participantId,
            participation_status_id: 3,
            domain_id: 1,
        }));

        const eventParticipantIds = (await knex
            .insert(data)
            .into("event_participants")
            .returning("participant_id")) as InsertEventParticipantsDTO;

        return eventParticipantIds;
    }

    return [];
};
