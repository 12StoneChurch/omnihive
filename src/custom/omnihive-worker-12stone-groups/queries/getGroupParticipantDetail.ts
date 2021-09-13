import dayjs from "dayjs";
import { Knex } from "knex";

import { BaseGroupMemberDetail } from "../models/GroupMember";

type SelectGroupParticipantsDTO = {
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
    gender: "Male" | "Female" | null;
    age: number | null;
};

type SelectContactsDTO = {
    household_id: number;
    contact_id: number;
    nickname: string;
    last_name: string;
    photo_guid: string | null;
    gender: "Male" | "Female" | null;
    age: number | null;
}[];

interface GroupParticipantDetailGetter {
    (knex: Knex, opts: { groupId: number; contactId: number }): Promise<BaseGroupMemberDetail>;
}

export const getGroupParticipantDetail: GroupParticipantDetailGetter = async (knex, { groupId, contactId }) => {
    const participantResult = (await knex
        .first([
            "gp.participant_id",
            "c.contact_id",
            "c.household_id",
            "c.nickname",
            "c.last_name",
            "c.email_address",
            "c.mobile_phone",
            "gp.start_date",
            knex.raw("iif(gr.role_title = 'Leader', 1, 0) as is_leader"),
            "f.unique_name as photo_guid",
            "gend.gender",
            "c.__age as age",
        ])
        .from("group_participants as gp")
        .leftJoin("contacts as c", "c.participant_record", "gp.participant_id")
        .leftJoin("genders as gend", "gend.gender_id", "c.gender_id")
        .leftJoin("group_roles as gr", "gr.group_role_id", "gp.group_role_id")
        .leftJoin("groups as g", "g.group_id", "gp.group_id")
        .leftJoin("dp_files as f", { "f.record_id": "c.contact_id", "f.page_id": 292, "f.default_image": 1 })
        .where("gp.group_id", groupId)
        .and.where("c.contact_id", contactId)
        .and.whereRaw("isnull(gp.end_date, '1/1/2100') >= getdate()")) as SelectGroupParticipantsDTO;

    if (!participantResult) {
        throw new Error("Contact does not exist in the specified group.");
    }

    const familyResult = (await knex
        .select(
            "c.contact_id",
            "c.household_id",
            "c.nickname",
            "c.last_name",
            "c.__age as age",
            "gend.gender",
            "f.unique_name as photo_guid"
        )
        .from("contacts as c")
        .leftJoin("genders as gend", "gend.gender_id", "c.gender_id")
        .leftJoin("dp_files as f", { "f.record_id": "c.contact_id", "f.page_id": 292, "f.default_image": 1 })
        .where("c.household_id", participantResult.household_id)
        .and.where("c.contact_id", "<>", contactId)) as SelectContactsDTO;

    return {
        contactId: participantResult.contact_id,
        participantId: participantResult.participant_id,
        householdId: participantResult.household_id,
        firstName: participantResult.nickname,
        lastName: participantResult.last_name,
        email: participantResult.email_address,
        phone: participantResult.mobile_phone ?? undefined,
        startDate: dayjs(participantResult.start_date).toISOString(),
        isLeader: participantResult.is_leader ? true : false,
        photoGuid: participantResult.photo_guid ?? undefined,
        gender: participantResult.gender ?? undefined,
        age: participantResult.age ?? undefined,
        family: familyResult.map((row) => ({
            contactId: row.contact_id,
            firstName: row.nickname,
            lastName: row.last_name,
            gender: row.gender ?? undefined,
            age: row.age ?? undefined,
            photoGuid: row.photo_guid ?? undefined,
        })),
    };
};
