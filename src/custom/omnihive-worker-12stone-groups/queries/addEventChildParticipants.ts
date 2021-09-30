import { Knex } from "knex";

type InsertEventParticipantsDTO = number[];

interface EventChildParticipantsAdder {
    (knex: Knex, opts: { eventId: number; participantId: number; childCount: number }): Promise<number[]>;
}

export const addEventChildParticipants: EventChildParticipantsAdder = async (
    knex,
    { eventId, participantId, childCount }
) => {
    if (childCount > 0) {
        const participantIds = Array<number>(childCount).fill(participantId);

        const data = participantIds.map((participantId) => ({
            event_id: eventId,
            participant_id: participantId,
            participation_status_id: 7,
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
