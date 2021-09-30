import dayjs from "dayjs";
import { Knex } from "knex";

import { AttendanceRecordSummary } from "../models/AttendanceRecord";
import { getDefaultParticipant } from "./getDefaultParticipant";

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

export interface AttendanceRecordsGetter {
    (knex: Knex, opts: { formId: number; groupId: number; page: number; perPage: number }): Promise<
        AttendanceRecordSummary[]
    >;
}

export const getAttendanceRecords: AttendanceRecordsGetter = async (knex, { formId, groupId, page, perPage }) => {
    const defaultParticipantId = await getDefaultParticipant(knex);

    const result = (await knex
        .select([
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
        .leftJoin("event_participants as ep", function () {
            this.on("eg.event_id", "=", "ep.event_id").onVal("ep.participant_id", "<>", defaultParticipantId);
        })
        .innerJoin(
            knex.raw(`(select form_response_id,
					          try_cast(gatheringid as int) as group_id,
						      try_cast(meetingdate as date) as date,
						      try_cast(anonparticipants as int) as anon_count,
						      try_cast(childparticipants as int) as child_count,
						      coachhelp as feedback
					   from (select fr.form_response_id,
						            ff.code_model_property,
									fra.response
						     from form_responses as fr
						     left join form_response_answers as fra on fra.form_response_id = fr.form_response_id
						     left join form_fields as ff on ff.form_field_id = fra.form_field_id
						     where fr.form_id = ${formId}
						) as t
					   pivot (max(response) for code_model_property in (GatheringId, MeetingDate, GroupParticipants, AnonParticipants, ChildParticipants, CountParticipants, CoachHelp)) as p
					  ) as sub`),

            function () {
                this.on("sub.group_id", "=", "eg.group_id");
                this.andOn("sub.date", "=", knex.raw("try_cast(e.event_start_date as date)"));
            }
        )
        .where("eg.group_id", groupId)
        .andWhere("et.event_type", "Attendance")
        // .andWhereNot("ep.participant_id", defaultParticipantId)
        .groupBy([
            "eg.event_id",
            "eg.group_id",
            "sub.form_response_id",
            "e.event_start_date",
            "sub.anon_count",
            "sub.child_count",
            "sub.feedback",
        ])
        .orderBy("e.event_start_date", "desc")
        .limit(perPage)
        .offset((page - 1) * perPage)) as SelectEventGroupsDTO[];

    return result.map((row) => ({
        groupId: row.group_id,
        eventId: row.event_id,
        date: dayjs(row.date).toISOString(),
        memberCount: row.member_count,
        anonCount: row.anon_count,
        childCount: row.child_count,
        totalCount: row.total_count,
        meetingOccurred: row.total_count > 0 ? true : false,
        feedback: row.feedback ?? undefined,
    }));
};
