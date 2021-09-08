import dayjs from "dayjs";
import { Knex } from "knex";

interface AttendanceEventAdder {
    (knex: Knex, opts: { groupId: number; date: string }): Promise<number>;
}

export const addAttendanceEvent: AttendanceEventAdder = async (knex, { groupId, date }) => {
    const [eventId] = await knex
        .insert({
            event_title: `Meeting Attendance - Group ${groupId} - ${dayjs(date).format("YYYY-MM-DD")}`,
            event_type_id: 39,
            congregation_id: 1,
            program_id: 1,
            primary_contact: 1,
            event_start_date: date,
            event_end_date: date,
            domain_id: 1,
        })
        .into("events")
        .returning<number[]>("event_id");

    return eventId;
};
