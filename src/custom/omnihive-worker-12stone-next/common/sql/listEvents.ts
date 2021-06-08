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

export const selectEventsList = (page: number, perPage: number): string => {
    return `
		select *,
       		   (q.participants_expected - q.participants_registered) spots_available
		from
			(select e.event_id id,
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
						e.childcare_age_range_min childcare_age_min,
						e.childcare_age_range_max childcare_age_max,
						e.primary_contact primary_contact_id,
						ct.first_name primary_contact_first_name,
						ct.last_name primary_contact_last_name,
						ct.email_address primary_contact_email,
						e.allow_anonymous_guests guests_allowed,
						e.participants_expected participants_expected,
						count(distinct ep.event_participant_id) participants_registered
				from (
					select x.event_id,
						x.event_title,
						x.description,
						x.featured_image_url,
						x.event_start_date,
						x.event_end_date,
						x.event_type_id,
						x.congregation_id,
						x.address_id,
						x.age_range_id,
						x.childcare_needed,
						x.childcare_capacity,
						x.childcare_age_range_max,
						x.childcare_age_range_min,
						x.primary_contact,
						x.allow_anonymous_guests,
						x.participants_expected
					from events x
					where x.event_start_date <= getdate()
					order by x.event_id desc
					offset ${(page - 1) * perPage} rows
					fetch next ${perPage} rows only
					) e
				left join event_types et on e.event_type_id = et.event_type_id
				left join congregations c on e.congregation_id = c.congregation_id
				left join addresses a on e.address_id = a.address_id
				left join age_ranges ar on e.age_range_id = ar.age_range_id
				left join contacts ct on e.primary_contact = ct.contact_id
				inner join event_participants ep on e.event_id = ep.event_id
				group by e.event_id,
						e.event_title,
						e.description,
						e.featured_image_url,
						e.allow_anonymous_guests,
						e.participants_expected,
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
						e.childcare_age_range_min,
						e.childcare_age_range_max,
						e.primary_contact,
						ct.first_name,
						ct.last_name,
						ct.email_address
			) q;
		`;
};
