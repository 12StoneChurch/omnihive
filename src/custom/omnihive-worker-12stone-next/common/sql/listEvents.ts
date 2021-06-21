export type SelectEventsListResult = {
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
}[];

export const selectEventsList = (page: number, perPage: number, visibility: number): string => {
    console.log({ offset: (page - 1) * perPage, rows: perPage });

    return `
		select e.event_id id,
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
			count(distinct ep.event_participant_id) participants_registered
		from (select distinct e.event_id,
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
							e.participants_expected
			from events e
			where e.event_start_date <= getDate()
				and e.visibility_level_id = ${visibility}
			order by e.event_start_date desc, e.event_id desc
			offset ${(page - 1) * perPage} rows
			fetch next ${perPage} rows only) e
		left join event_types et on e.event_type_id = et.event_type_id
		left join congregations c on e.congregation_id = c.congregation_id
		left join addresses a on e.address_id = a.address_id
		left join age_ranges ar on e.age_range_id = ar.age_range_id
		left join contacts ct on e.primary_contact = ct.contact_id
		left join event_participants ep on e.event_id = ep.event_id
		group by e.event_id,
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
				e.participants_expected;
		`;
};