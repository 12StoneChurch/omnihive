import { Knex } from "knex";

interface LeaderGroupsCounter {
    (knex: Knex, opts: { participantId: number }): Promise<number>;
}

export const countLeaderGroups: LeaderGroupsCounter = async (knex: Knex, { participantId }) => {
    return (
        await knex
            .select("gp.group_id")
            .from("group_participants as gp")
            .leftJoin("group_roles as gr", "gr.group_role_id", "gp.group_role_id")
            .where("gp.participant_id", participantId)
            .and.where("gr.role_title", "Leader")
    ).length;
};
