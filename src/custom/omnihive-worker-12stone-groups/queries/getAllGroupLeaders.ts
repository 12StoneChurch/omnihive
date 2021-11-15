import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import weekday from "dayjs/plugin/weekday";
import { Knex } from "knex";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";

import { NotificationSummary } from "../models/Notification";

dayjs.extend(weekday);
dayjs.extend(utc);

const getMeetingIsToday = (meetingDay: number) => {
    const convertedMeetingDay = meetingDay - 1; // because mp meeting days are Sunday = 1 with no zero index

    const day = dayjs().day();

    return day === convertedMeetingDay;
};

const getMeetingIsLastHour = (meetingTime: Date) => {
    const meetingHour = dayjs(meetingTime).utc().hour();

    const hour = dayjs().utc(true).hour();

    if (hour === 0 && meetingHour === 23) {
        return true;
    }

    if (hour - 1 === meetingHour) {
        return true;
    }

    return false;
};

interface GroupParticipantsDTO {
    group_id: number;
    contact_id: number;
    group_name: string;
    meeting_day_id: number;
    meeting_day: string;
    meeting_time: Date;
    mobile_phone: string;
}

interface AllGroupLeadersGetter {
    (databaseWorker: IDatabaseWorker, attendanceOnly?: boolean): Promise<NotificationSummary[]>;
}

export const getAllGroupLeaders: AllGroupLeadersGetter = async (
    databaseWorker: IDatabaseWorker,
    attendanceOnly?: boolean
) => {
    const knex: Knex = databaseWorker.connection;
    const queryBuilder: Knex.QueryBuilder<any, any> = knex.queryBuilder();
    queryBuilder.distinct([
        "g.group_id",
        "c.contact_id",
        "g.group_name",
        "g.meeting_day_id",
        "md.meeting_day",
        "g.meeting_time",
        "c.mobile_phone",
    ]);
    queryBuilder.from("group_participants as gp");
    queryBuilder.leftJoin("group_roles as gr", "gp.group_role_id", "gr.group_role_id");
    queryBuilder.leftJoin("groups as g", "gp.group_id", "g.group_id");
    queryBuilder.leftJoin("group_statuses as gs", "g.group_status_id", "gs.group_status_id");
    queryBuilder.leftJoin("meeting_days as md", "g.meeting_day_id", "md.meeting_day_id");
    queryBuilder.leftJoin("contacts as c", "gp.participant_id", "c.participant_record");
    queryBuilder.whereNotNull("g.meeting_day_id");
    queryBuilder.andWhereRaw("g.meeting_time is not null");
    queryBuilder.andWhereRaw("isNull(g.end_date, '1/1/2100') >= getDate()");
    queryBuilder.andWhereRaw("isNull(gp.end_date, '1/1/2100') >= getDate()");
    queryBuilder.andWhere("gr.role_title", "Leader");
    queryBuilder.andWhereRaw("c.mobile_phone is not null");
    queryBuilder.andWhere("c.do_not_text", 0);

    if (attendanceOnly) {
        queryBuilder.andWhere("g.Enable_Attendance", 1);
    }

    const result = (await databaseWorker.executeQuery(queryBuilder.toString()))[0] as GroupParticipantsDTO[];

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
            isLastHour: getMeetingIsLastHour(row.meeting_time),
            phone: row.mobile_phone,
        };
    });
};
