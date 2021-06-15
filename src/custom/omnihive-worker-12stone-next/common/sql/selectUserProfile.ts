export type SelectUserProfileResult = {
    id: number;
    contact_id: number;
    first_name: string;
    last_name: string;
    email: string;
}[];

export const selectUserProfile = (id: number): string => {
    return `
		select distinct u.user_id id,
						c.contact_id contact_id,
						c.first_name first_name,
						c.last_name last_name,
						u.user_email email
		from dp_users u
		left join contacts c on u.user_id = c.user_account
		where u.user_id = ${id};
	`;
};
