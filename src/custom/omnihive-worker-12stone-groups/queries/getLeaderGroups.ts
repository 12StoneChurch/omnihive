import dayjs from "dayjs";
import { Knex } from "knex";

import { BaseGroupSummary } from "../models/GroupSummary";

interface LeaderGroupsGetter {
    (knex: Knex, opts: { participantId: number }): Promise<BaseGroupSummary[]>;
}

export const getLeaderGroups: LeaderGroupsGetter = async (knex, { participantId }) => {
    const result = await knex
        .select([
            "g.group_id",
            "g.group_name",
            "g.meeting_day_id",
            "md.meeting_day",
            "g.meeting_time",
            knex.raw("count(gp2.participant_id) as total_participants"),
        ])
        .from("group_participants as gp")
        .leftJoin("group_roles as gr", "gr.group_role_id", "gp.group_role_id")
        .leftJoin("groups as g", "g.group_id", "gp.group_id")
        .leftJoin("group_statuses as gs", "gs.group_status_id", "g.group_status_id")
        .leftJoin("meeting_days as md", "md.meeting_day_id", "g.meeting_day_id")
        .leftJoin("group_participants as gp2", "gp2.group_id", "g.group_id")
        .where("gp.participant_id", participantId)
        .and.where("g.enable_attendance", 1)
        .and.where("gr.role_title", "Leader")
        .and.whereRaw("isnull(g.end_date, '1/1/2100') >= getdate()")
        .and.whereRaw("isnull(gp.end_date, '1/1/2100') >= getdate()")
        .and.whereRaw("isnull(gp2.end_date, '1/1/2100') >= getdate()")
        .and.whereIn("gs.group_status", ["Open For Signup", "Full", "Private", "Closed"])
        .groupBy(["g.group_id", "g.group_name", "g.meeting_time", "g.meeting_day_id", "md.meeting_day"]);

    // <
    //         any,
    //         {
    //             group_id: number;
    //             group_name: string;
    //             meeting_day_id: number | null;
    //             meeting_day: MeetingDay | null;
    //             meeting_time: Date | null;
    //             total_participants: number;
    //         }[]
    //     >

    return result.map<BaseGroupSummary>((row) => ({
        groupId: row.group_id,
        name: row.group_name,
        day: row.meeting_day_id && row.meeting_day ? { id: row.meeting_day_id, name: row.meeting_day } : undefined,
        time: dayjs(row.meeting_time).toISOString() ?? undefined,
        totalParticipants: row.total_participants,
    }));
};
