import dayjs from "dayjs";
import { Knex } from "knex";

import { BaseGroupMemberSummary } from "../models/GroupMember";

type SelectGroupParticipantsDTO = {
    participant_id: number;
    contact_id: number;
    nickname: string;
    last_name: string;
    start_date: Date;
    is_leader: boolean;
    photo_guid?: string;
}[];

interface GroupParticipantsGetter {
    (knex: Knex, opts: { groupId: number; page: number; perPage: number }): Promise<BaseGroupMemberSummary[]>;
}

export const getGroupParticipants: GroupParticipantsGetter = async (knex, { groupId, page, perPage }) => {
    const result = (await knex
        .select([
            "gp.participant_id",
            "c.contact_id",
            "c.nickname",
            "c.last_name",
            "gp.start_date",
            knex.raw("iif(gr.role_title = 'Leader', 1, 0) as is_leader"),
            "f.unique_name as photo_guid",
        ])
        .from("group_participants as gp")
        .leftJoin("contacts as c", "c.participant_record", "gp.participant_id")
        .leftJoin("group_roles as gr", "gr.group_role_id", "gp.group_role_id")
        .leftJoin("groups as g", "g.group_id", "gp.group_id")
        .leftJoin("dp_files as f", { "f.record_id": "c.contact_id", "f.page_id": 292, "f.default_image": 1 })
        .where("gp.group_id", groupId)
        .and.whereRaw("isnull(gp.end_date, '1/1/2100') >= getdate()")
        .limit(perPage)
        .offset((page - 1) * perPage)) as SelectGroupParticipantsDTO;

    return result.map<BaseGroupMemberSummary>((row) => ({
        participantId: row.participant_id,
        contactId: row.contact_id,
        firstName: row.nickname,
        lastName: row.last_name,
        startDate: dayjs(row.start_date).toISOString(),
        isLeader: row.is_leader ? true : false,
        photoGuid: row.photo_guid,
    }));
};
