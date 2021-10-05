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
            .leftJoin("groups as g", "g.group_id", "gp.group_id")
            .leftJoin("group_statuses as gs", "gs.group_status_id", "g.group_status_id")
            .where("gp.participant_id", participantId)
            .and.where("gr.role_title", "Leader")
            .and.where("g.enable_attendance", 1)
            .and.whereRaw("isnull(g.end_date, '1/1/2100') >= getdate()")
            .and.whereRaw("isnull(gp.end_date, '1/1/2100') >= getdate()")
    ).length;
};
