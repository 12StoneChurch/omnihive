import { Knex } from "knex";

export const checkForExistingContactPublication = async (connection: Knex, trainingId: number, contactId: number) => {
    const query = connection.queryBuilder();

    query
        .select("cp.contact_publication_id", "t.training_id")
        .from("dp_contact_publications as cp")
        .innerJoin("trainings as t", "t.publication_id", "cp.publication_id")
        .where("cp.contact_id", contactId)
        .andWhere("t.training_id", trainingId);

    return query;
};
