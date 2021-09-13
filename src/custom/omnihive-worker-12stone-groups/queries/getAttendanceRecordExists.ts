import dayjs from "dayjs";
import { Knex } from "knex";

type SelectEventsDTO = { event_id: number }[];
interface AttendanceRecordByDateGetter {
    (knex: Knex, opts: { groupId: number; date: string }): Promise<boolean>;
}

export const getAttendanceRecordExists: AttendanceRecordByDateGetter = async (knex, { groupId, date }) => {
    const result = (await knex
        .select("e.event_id")
        .from("events as e")
        .innerJoin("event_groups as eg", "eg.event_id", "e.event_id")
        .where("eg.group_id", groupId)
        .and.where("e.event_type_id", 39)
        .and.whereRaw(`datediff(dd,e.event_start_date,'${dayjs(date).format("YYYY-MM-DD")}')=0`)) as SelectEventsDTO;

    return result.length > 0;
};
