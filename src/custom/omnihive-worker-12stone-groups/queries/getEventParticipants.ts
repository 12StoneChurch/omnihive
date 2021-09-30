import dayjs from "dayjs";
import { Knex } from "knex";

import { BaseGroupMemberSummary } from "../models/GroupMember";
import { getDefaultParticipant } from "./getDefaultParticipant";

type SelectEventParticipantsDTO = {
    participant_id: number;
    contact_id: number;
    household_id: number;
    nickname: string;
    last_name: string;
    email_address: string;
    mobile_phone: string | null;
    start_date: Date;
    is_leader: boolean;
    photo_guid: string | null;
}[];

interface EventParticipantsGetter {
    (knex: Knex, opts: { eventId: number }): Promise<BaseGroupMemberSummary[]>;
}

export const getEventParticipants: EventParticipantsGetter = async (knex, { eventId }) => {
    const defaultParticipantId = await getDefaultParticipant(knex);

    const result = (await knex
        .select([
            "ep.participant_id",
            "c.contact_id",
            "c.household_id",
            "c.nickname",
            "c.last_name",
            "c.email_address",
            "c.mobile_phone",
            "gp.start_date",
            knex.raw("iif(gr.role_title = 'Leader', 1, 0) as is_leader"),
            "f.unique_name as photo_guid",
        ])
        .from("event_participants as ep")
        .leftJoin("events as e", "ep.event_id", "e.event_id")
        .leftJoin("event_types as et", "e.event_type_id", "et.event_type_id")
        .leftJoin("event_groups as eg", "ep.event_id", "eg.event_id")
        .leftJoin("group_participants as gp", {
            "ep.participant_id": "gp.participant_id",
            "eg.group_id": "gp.group_id",
        })
        .leftJoin("group_roles as gr", "gp.group_role_id", "gr.group_role_id")
        .leftJoin("contacts as c", "ep.participant_id", "c.participant_record")
        .leftJoin("dp_files as f", { "f.record_id": "c.contact_id", "f.page_id": 292, "f.default_image": 1 })
        .where("et.event_type", "Attendance")
        .andWhere("ep.event_id", eventId)
        .andWhere("ep.participant_id", "<>", defaultParticipantId)) as SelectEventParticipantsDTO;

    return result.map<BaseGroupMemberSummary>((row) => ({
        participantId: row.participant_id,
        contactId: row.contact_id,
        householdId: row.household_id,
        firstName: row.nickname,
        lastName: row.last_name,
        email: row.email_address,
        phone: row.mobile_phone ?? undefined,
        startDate: dayjs(row.start_date).toISOString(),
        isLeader: row.is_leader ? true : false,
        photoGuid: row.photo_guid ?? undefined,
    }));
};
