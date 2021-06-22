import { EVENT_TYPE_ID, REGISTERED_STATUS_ID } from "../constants";

export type SelectRegisteredEventsCountResult = {
    total: number;
}[];

export const selectRegisteredEventsCount = (userId: number, visibility: number): string => {
    return `
		declare @event_type int = ${EVENT_TYPE_ID}
		declare @visibility int = ${visibility}
		declare @user_id int = ${userId}
		declare @participation_status_id int = ${REGISTERED_STATUS_ID}

		select count(e.event_id) total
		from events e
		inner join (select distinct ep.event_id event_id,
									ep.participation_status_id participation_status_id
					from dp_users u
					inner join contacts c on u.user_id = c.user_account
					inner join participants p on c.contact_id = p.contact_id
					inner join event_participants ep on p.participant_id = ep.participant_id
					where u.user_id = @user_id
						and ep.participation_status_id = @participation_status_id) ep on ep.event_id = e.event_id
		where e.event_type_id = @event_type
			and e.visibility_level_id = @visibility;
	`;
};
