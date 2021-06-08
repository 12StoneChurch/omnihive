export type SelectEventsCountResult = {
    total: number;
}[];

export const selectEventsCount = (): string => {
    return `
		select count(distinct e.event_id) as total
		from events e;
	`;
};
