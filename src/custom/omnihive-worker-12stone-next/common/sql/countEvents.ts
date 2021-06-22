import { EVENT_TYPE_ID } from "../constants";

export type SelectEventsCountResult = {
    total: number;
}[];

export const selectEventsCount = (visibility: number): string => {
    return `
		declare @event_type int = ${EVENT_TYPE_ID}
		declare @visibility int = ${visibility}

		select count(distinct e.event_id) as total
		from events e
		where e.event_start_date >= getdate()
			and e.event_type_id = @event_type
			and e.visibility_level_id = @visibility;
	`;
};
