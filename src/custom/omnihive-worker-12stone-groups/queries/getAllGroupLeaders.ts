import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday";
import { Knex } from "knex";

import { NotificationSummary } from "../models/Notification";

dayjs.extend(weekday);

const getMeetingIsToday = (meetingDay: number) => {
    const convertedMeetingDay = meetingDay - 1; // because mp meeting days are Sunday = 1 with no zero index

    const day = dayjs().day();

    return day === convertedMeetingDay;
};

interface GroupParticipantsDTO {
    group_id: number;
    contact_id: number;
    group_name: string;
    meeting_day_id: number;
    meeting_day: string;
    mobile_phone: string;
}

interface AllGroupLeadersGetter {
    (knex: Knex): Promise<NotificationSummary[]>;
}

export const getAllGroupLeaders: AllGroupLeadersGetter = async (knex: Knex) => {
    const result = (await knex
        .distinct([
            "g.group_id",
            "c.contact_id",
            "g.group_name",
            "g.meeting_day_id",
            "md.meeting_day",
            "c.mobile_phone",
        ])
        .from("group_participants as gp")
        .leftJoin("group_roles as gr", "gp.group_role_id", "gr.group_role_id")
        .leftJoin("groups as g", "gp.group_id", "g.group_id")
        .leftJoin("group_statuses as gs", "g.group_status_id", "gs.group_status_id")
        .leftJoin("meeting_days as md", "g.meeting_day_id", "md.meeting_day_id")
        .leftJoin("contacts as c", "gp.participant_id", "c.participant_record")
        .whereNotNull("g.meeting_day_id")
        .and.whereRaw("isnull(g.end_date, '1/1/2100') >= getdate()")
        .and.whereRaw("isnull(gp.end_date, '1/1/2100') >= getdate()")
        .and.whereIn("gs.group_status", ["Open For Signup", "Full", "Private", "Closed"])
        .and.where("gr.role_title", "Leader")
        .and.whereNotNull("c.mobile_phone")) as GroupParticipantsDTO[];

    return result.map((row) => {
        return {
            groupId: row.group_id,
            contactId: row.contact_id,
            groupName: row.group_name,
            day: {
                meetingDayId: row.meeting_day_id,
                name: row.meeting_day,
            },
            isToday: getMeetingIsToday(row.meeting_day_id),
            phone: row.mobile_phone,
        };
    });
};
