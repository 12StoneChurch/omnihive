import { Knex } from "knex";

export interface AttendanceRecordsCounter {
    (knex: Knex, opts: { formId: number; groupId: number }): Promise<number>;
}

export const countAttendanceRecords: AttendanceRecordsCounter = async (knex, { formId, groupId }) => {
    return (
        await knex
            .distinct(["eg.event_id"])
            .from("event_groups as eg")
            .leftJoin("events as e", "eg.event_id", "e.event_id")
            .leftJoin("event_types as et", "e.event_type_id", "et.event_type_id")
            .leftJoin("event_participants as ep", "eg.event_id", "ep.event_id")
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
            .groupBy(["eg.event_id"])
    ).length;
};
