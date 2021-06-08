export type SelectEventsCountResult = {
    total: number;
}[];

export const selectEventsCount = (visibility: number): string => {
    return `
		select count(distinct e.event_id) as total
		from events e
		where e.visibility_level_id = ${visibility};
	`;
};
