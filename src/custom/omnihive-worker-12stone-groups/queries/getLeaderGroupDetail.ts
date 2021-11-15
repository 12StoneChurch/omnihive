import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday";
import { Knex } from "knex";

import { BaseGroupDetail, GroupStatus, MeetingDay } from "../models/Group";

dayjs.extend(weekday);

const getLastMeetingDate = (meetingDay: number) => {
    const convertedMeetingDay = meetingDay - 1; // database stores meeting days as Sunday = 1
    // dayjs uses Sunday = 0 like a normal person

    const date = dayjs().startOf("day");
    const day = date.get("day");

    if (day === convertedMeetingDay) {
        return date.toDate();
    }

    if (date.set("day", convertedMeetingDay).isAfter(date, "day")) {
        return date.set("day", convertedMeetingDay).subtract(1, "week").toDate();
    }

    return date.set("day", convertedMeetingDay).toDate();
};

interface SelectGroupsDTO {
    group_id: number;
    group_name: string;
    meeting_day_id: number | null;
    meeting_day: MeetingDay | null;
    meeting_time: Date | null;
    coach_contact_id: number | null;
    coach_nickname: string | null;
    coach_last_name: string | null;
    coach_email_address: string | null;
    coach_mobile_phone: string | null;
    group_status_id: number;
    group_status: GroupStatus;
    total_participants: number;
    enable_invites: boolean;
}

export interface LeaderGroupDetailGetter {
    (knex: Knex, opts: { groupId: number }): Promise<BaseGroupDetail>;
}

export const getLeaderGroupDetail: LeaderGroupDetailGetter = async (knex, { groupId }) => {
    const result = (await knex
        .first([
            "g.group_id",
            "g.group_name",
            "g.meeting_day_id",
            "md.meeting_day",
            "g.meeting_time",
            "g.coach as coach_contact_id",
            "c.nickname as coach_nickname",
            "c.last_name as coach_last_name",
            "c.email_address as coach_email_address",
            "c.mobile_phone as coach_mobile_phone",
            "g.group_status_id",
            "gs.group_status",
            knex.raw("count(gp.participant_id) as total_participants"),
            "g.Enable_Invites as enable_invites",
        ])
        .from("groups as g")
        .leftJoin("group_statuses as gs", "gs.group_status_id", "g.group_status_id")
        .leftJoin("meeting_days as md", "md.meeting_day_id", "g.meeting_day_id")
        .leftJoin("group_participants as gp", "gp.group_id", "g.group_id")
        .leftJoin("contacts as c", "c.contact_id", "g.coach")
        .where("g.group_id", groupId)
        .and.whereRaw("isnull(gp.end_date, '1/1/2100') >= getdate()")
        .groupBy([
            "g.group_id",
            "g.group_name",
            "g.meeting_day_id",
            "md.meeting_day",
            "g.meeting_time",
            "g.coach",
            "c.nickname",
            "c.last_name",
            "c.email_address",
            "c.mobile_phone",
            "g.group_status_id",
            "gs.group_status",
            "g.Enable_Invites",
        ])) as SelectGroupsDTO;

    return {
        groupId: result.group_id,
        name: result.group_name,
        day:
            result.meeting_day_id && result.meeting_day
                ? {
                      meetingDayId: result.meeting_day_id,
                      name: result.meeting_day,
                  }
                : undefined,
        time: result.meeting_time ? dayjs(result.meeting_time).toISOString() : undefined,
        lastMeetingDate: result.meeting_day_id ? getLastMeetingDate(result.meeting_day_id).toISOString() : undefined,
        status: { statusId: result.group_status_id, name: result.group_status },
        coach:
            result.coach_contact_id && result.coach_nickname && result.coach_last_name
                ? {
                      contactId: result.coach_contact_id,
                      firstName: result.coach_nickname,
                      lastName: result.coach_last_name,
                      email: result.coach_email_address ?? undefined,
                      phone: result.coach_mobile_phone ?? undefined,
                  }
                : undefined,
        totalParticipants: result.total_participants,
        enable_invites: result.enable_invites,
    };
};
