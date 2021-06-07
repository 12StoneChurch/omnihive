export type SelectEventTagResult = { id: number; tag: string }[];

export const selectEventTags = (eventId: number): string => {
    return `
		select ete.event_tag_id id,
			   et.event_tag tag
		from event_tag_events ete
		left join event_tags et on ete.event_tag_id = et.event_tag_id
		where event_id = ${eventId};
	`;
};
