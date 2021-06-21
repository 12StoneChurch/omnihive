export type SelectEventsCountResult = {
    total: number;
}[];

export const selectEventsCount = (visibility: number): string => {
    return `
		declare @visibility int = ${visibility}

		select count(distinct e.event_id) as total
		from events e
		where e.event_start_date >= getdate()
			and e.visibility_level_id = @visibility;
	`;
};
