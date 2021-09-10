import { Knex } from "knex";

type InsertEventGroupsDTO = number[];

interface EventGroupAdder {
    (knex: Knex, opts: { groupId: number; eventId: number }): Promise<number>;
}

export const addEventGroup: EventGroupAdder = async (knex, { groupId, eventId }) => {
    const [eventGroupId] = (await knex
        .insert({ event_id: eventId, group_id: groupId, domain_id: 1 })
        .into("event_groups")
        .returning("event_group_id")) as InsertEventGroupsDTO;

    return eventGroupId;
};
