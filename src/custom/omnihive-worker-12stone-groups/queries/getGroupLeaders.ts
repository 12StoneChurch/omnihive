import { Knex } from "knex";

import { GroupLeaderSummary } from "../models/Group";

type SelectGroupParticipantsDTO = {
    contact_id: number;
    nickname: string;
    last_name: string;
}[];

export interface GroupLeadersGetter {
    (knex: Knex, opts: { groupId: number }): Promise<GroupLeaderSummary[]>;
}

export const getGroupLeaders: GroupLeadersGetter = async (knex, { groupId }) => {
    const result = (await knex
        .select(["c.contact_id", "c.nickname", "c.last_name"])
        .from("group_participants as gp")
        .leftJoin("group_roles as gr", "gr.group_role_id", "gp.group_role_id")
        .leftJoin("contacts as c", "c.participant_record", "gp.participant_id")
        .where("gp.group_id", groupId)
        .and.where("gr.role_title", "Leader")) as SelectGroupParticipantsDTO;

    return result.map<GroupLeaderSummary>((row) => ({
        contactId: row.contact_id,
        firstName: row.nickname,
        lastName: row.last_name,
    }));
};
