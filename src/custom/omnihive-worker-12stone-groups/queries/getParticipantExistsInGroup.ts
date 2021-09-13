import { Knex } from "knex";

type SelectGroupParticipantsDTO = { participant_id: number }[];

interface ParticipantExistsInGroupGetter {
    (knex: Knex, opts: { participantId: number; groupId: number }): Promise<boolean>;
}

export const getParticipantExistsInGroup: ParticipantExistsInGroupGetter = async (knex, { participantId, groupId }) => {
    const result = (await knex
        .select("participant_id")
        .from("group_participants")
        .where("group_id", groupId)
        .and.where("participant_id", participantId)
        .and.whereRaw("isnull(end_date, '1/1/2100') >= getdate()")) as SelectGroupParticipantsDTO;

    return result.length > 0;
};
