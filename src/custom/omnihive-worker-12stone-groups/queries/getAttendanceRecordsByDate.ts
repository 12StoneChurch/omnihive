import dayjs from "dayjs";
import { Knex } from "knex";

interface AttendanceRecordByDateGetter {
    (knex: Knex, opts: { groupId: number; date: string }): Promise<{ event_id: number }[]>;
}

export const getAttendanceRecordsByDate: AttendanceRecordByDateGetter = async (knex, { groupId, date }) => {
    return await knex
        .select<number[]>("e.event_id")
        .from("events as e")
        .innerJoin("event_groups as eg", "eg.event_id", "e.event_id")
        .where("eg.group_id", groupId)
        .and.where("e.event_type_id", 39)
        .and.whereRaw(`datediff(dd,e.event_start_date,'${dayjs(date).format("YYYY-MM-DD")}')=0`);
};
