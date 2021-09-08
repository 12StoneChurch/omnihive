import dayjs from "dayjs";
import { Knex } from "knex";

interface GroupParticipantAdder {
    (knex: Knex, opts: { groupId: number; participantId: number }): Promise<number>;
}

export const addGroupParticipant: GroupParticipantAdder = async (knex, { groupId, participantId }) => {
    const [groupParticipantId] = await knex
        .insert({
            group_id: groupId,
            participant_id: participantId,
            group_role_id: 14,
            domain_id: 1,
            start_date: dayjs().toISOString(),
        })
        .into("group_participants")
        .returning<number[]>(["group_participant_id"]);

    return groupParticipantId;
};
