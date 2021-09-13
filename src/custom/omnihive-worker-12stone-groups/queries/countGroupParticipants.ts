import { Knex } from "knex";

interface GroupParticipantsCounter {
    (knex: Knex, opts: { groupId: number }): Promise<number>;
}

export const countGroupParticipants: GroupParticipantsCounter = async (knex, { groupId }) => {
    const result = await knex
        .select("gp.participant_id")
        .from("group_participants as gp")
        .leftJoin("contacts as c", "c.participant_record", "gp.participant_id")
        .leftJoin("group_roles as gr", "gr.group_role_id", "gp.group_role_id")
        .leftJoin("groups as g", "g.group_id", "gp.group_id")
        .leftJoin("dp_files as f", { "f.record_id": "f.page_id", "f.page_id": 292, "f.default_image": 1 })
        .where("gp.group_id", groupId)
        .and.whereRaw("isnull(gp.end_date, '1/1/2100') >= getdate()");

    return result.length;
};
