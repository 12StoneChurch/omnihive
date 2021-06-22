import { EVENT_TYPE_ID, REGISTERED_STATUS_ID } from "../constants";

export type SelectUserEventsListResult = {
    id: number;
    title: string;
    description: string | null;
    img_url: string | null;
    start_date: string;
    end_date: string;
    type_id: number;
    type: string;
    campus_id: number;
    campus: string;
    address_id: number | null;
    address_line_1: string | null;
    address_line_2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    age_range_id: number | null;
    age_range: string | null;
    childcare_available: boolean | null;
    childcare_capacity: number | null;
    childcare_age_min: number | null;
    childcare_age_max: number | null;
    primary_contact_id: number;
    primary_contact_first_name: string | null;
    primary_contact_last_name: string | null;
    primary_contact_email: string;
    guests_allowed: boolean | null;
    participants_expected: number | null;
    participants_registered: number;
    spots_available: number | null;
    participation_status_id: number | null;
    participation_status: string | null;
}[];

export const selectRegisteredUserEventsList = (
    page: number,
    perPage: number,
    userId: number,
    visibility: number
): string => {
    return `
		declare @page int = ${page}
		declare @per_page int = ${perPage}
		declare @user_id int = ${userId}
		declare @event_type int = ${EVENT_TYPE_ID}
		declare @visibility int = ${visibility}
		declare @participation_status_id int = ${REGISTERED_STATUS_ID}

		select distinct e.*,
						(e.participants_expected - e.participants_registered) spots_available
		from (select distinct e.event_id id,
					          e.event_title title,
							  e.description description,
							  e.featured_image_url img_url,
							  e.event_start_date start_date,
							  e.event_end_date end_date,
							  e.event_type_id type_id,
							  et.event_type type,
							  e.congregation_id campus_id,
							  c.congregation_name campus,
							  e.address_id address_id,
							  a.address_line_1 address_line_1,
							  a.address_line_2 address_line_2,
							  a.city city,
							  a.[State/Region] state,
							  a.postal_code postal_code,
							  e.age_range_id age_range_id,
							  ar.age_ranges age_range,
							  e.childcare_needed childcare_available,
							  e.childcare_capacity childcare_capacity,
							  e.primary_contact primary_contact_id,
							  ct.first_name primary_contact_first_name,
							  ct.last_name primary_contact_last_name,
							  ct.email_address primary_contact_email,
							  e.allow_anonymous_guests guests_allowed,
							  e.participants_expected participants_expected,
							  count(distinct ep.event_participant_id) participants_registered,
							  e.participation_status,
							  e.participation_status_id
				from (select distinct e.event_id,
									  e.event_title,
									  e.description,
									  e.featured_image_url,
									  e.event_start_date,
									  e.event_end_date,
									  e.event_type_id,
									  e.congregation_id,
									  e.address_id,
									  e.age_range_id,
									  e.childcare_needed,
									  e.childcare_capacity,
									  e.primary_contact,
									  e.allow_anonymous_guests,
									  e.participants_expected,
									  ep.participation_status_id,
									  ep.participation_status
					from events e
					inner join (select distinct ep.event_id event_id,
												ps.participation_status participation_status,
												ep.participation_status_id participation_status_id
							from dp_users u
							inner join contacts c on u.user_id = c.user_account
							inner join participants p on c.contact_id = p.contact_id
							inner join event_participants ep on p.participant_id = ep.participant_id
							inner join participation_statuses ps on ep.participation_status_id = ps.participation_status_id
							where u.user_id = @user_id and ps.participation_status_id = @participation_status_id
						) ep on e.event_id = ep.event_id
					where e.event_start_date >= getDate()
					    and e.event_type_id = @event_type
						and e.visibility_level_id = @visibility
					order by e.event_start_date, e.event_id
					offset (@page - 1) * @per_page rows
					fetch next @per_page rows only) e
				left join event_types et on e.event_type_id = et.event_type_id
				left join congregations c on e.congregation_id = c.congregation_id
				left join addresses a on e.address_id = a.address_id
				left join age_ranges ar on e.age_range_id = ar.age_range_id
				left join contacts ct on e.primary_contact = ct.contact_id
				left join event_participants ep on e.event_id = ep.event_id
				and ep.participation_status_id not in (5, 7)
				group by e.event_id,
						 e.event_title,
						 e.description,
						 e.featured_image_url,
						 e.event_start_date,
						 e.event_end_date,
						 e.event_type_id,
						 et.event_type,
						 e.congregation_id,
						 c.congregation_name,
						 e.address_id,
						 a.address_line_1,
						 a.address_line_2,
						 a.city,
						 a.[State/Region],
						 a.postal_code,
						 e.age_range_id,
						 ar.age_ranges,
						 e.childcare_needed,
						 e.childcare_capacity,
						 e.primary_contact,
						 ct.first_name,
						 ct.last_name,
						 ct.email_address,
						 e.allow_anonymous_guests,
						 e.participants_expected,
						 e.participation_status_id,
						 e.participation_status) e;
		`;
};
