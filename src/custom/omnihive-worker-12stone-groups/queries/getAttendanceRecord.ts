import dayjs from "dayjs";
import { Knex } from "knex";

import { AttendanceRecordSummary } from "../models/AttendanceRecord";

interface SelectEventGroupsDTO {
    event_id: number;
    group_id: number;
    form_response_id: number;
    date: Date;
    feedback?: string;
    member_count: number;
    anon_count: number;
    child_count: number;
    total_count: number;
    meeting_occurred: number;
}

export interface AttendanceRecordGetter {
    (knex: Knex, opts: { formId: number; eventId: number }): Promise<AttendanceRecordSummary>;
}

export const getAttendanceRecord: AttendanceRecordGetter = async (knex, { formId, eventId }) => {
    const result = (await knex
        .first([
            "eg.event_id",
            "eg.group_id",
            "sub.form_response_id",
            knex.raw("try_cast(e.event_start_date as date) as date"),
            "sub.feedback",
            knex.raw("count(ep.participant_id) as member_count"),
            "sub.anon_count",
            "sub.child_count",
            knex.raw("(sub.anon_count + sub.child_count + count(ep.participant_id)) as total_count"),
            knex.raw("iif(sub.anon_count + sub.child_count + count(ep.participant_id) < 1, 0, 1) as meeting_occurred"),
        ])
        .from("event_groups as eg")
        .leftJoin("events as e", "eg.event_id", "e.event_id")
        .leftJoin("event_types as et", "e.event_type_id", "et.event_type_id")
        .leftJoin("event_participants as ep", "eg.event_id", "ep.event_id")
        .innerJoin(
            knex.raw(`(select form_response_id,
					          try_cast(groupid as int) as group_id,
						      try_cast(date as date) as date,
						      try_cast(anonparticipants as int) as anon_count,
						      try_cast(childparticipants as int) as child_count,
						      coachfeedback as feedback
					   from (select fr.form_response_id,
						            ff.code_model_property,
									fra.response
						     from form_responses as fr
						     left join form_response_answers as fra on fra.form_response_id = fr.form_response_id
						     left join form_fields as ff on ff.form_field_id = fra.form_field_id
						     where fr.form_id = ${formId}
						) as t
					   pivot (max(response) for code_model_property in (GroupId, Date, GroupParticipants, AnonParticipants, ChildParticipants, CountParticipants, CoachFeedback)) as p
					  ) as sub`),

            function () {
                this.on("sub.group_id", "=", "eg.group_id");
                this.andOn("sub.date", "=", knex.raw("try_cast(e.event_start_date as date)"));
            }
        )
        .where("eg.event_id", eventId)
        .andWhere("et.event_type", "Attendance")
        .groupBy([
            "eg.event_id",
            "eg.group_id",
            "sub.form_response_id",
            "e.event_start_date",
            "sub.anon_count",
            "sub.child_count",
            "sub.feedback",
        ])) as SelectEventGroupsDTO;

    return {
        groupId: result.group_id,
        eventId: result.event_id,
        date: dayjs(result.date).toISOString(),
        memberCount: result.member_count,
        anonCount: result.anon_count,
        childCount: result.child_count,
        totalCount: result.total_count,
        meetingOccurred: result.total_count > 0 ? true : false,
        feedback: result.feedback ?? undefined,
    };
};
