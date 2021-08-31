import { Knex } from "knex";

export const startTraining = async (connection: Knex, trainingId: number, contactId: number) => {
    const start = await connection.transaction(async (trx) => {
        const pubData = await getTrainingPublicationId(connection, trainingId).transacting(trx);
        const publicationId = pubData[0].publication_id;

        const insertContactPub = await addContactPublication(connection, contactId, publicationId).transacting(trx);

        const pastPhysicalParticipationCount = await getPastPhysicalTrainingParticipation(
            connection,
            contactId,
            trainingId
        ).transacting(trx);
        const pastParticipation = pastPhysicalParticipationCount[0].count > 0;

        const campus = await getContactCampus(connection, contactId).transacting(trx);
        const campusId = campus[0].campus_id;

        return {
            publicationId,
            pastParticipation,
            campusId,
            contactPublication: insertContactPub,
        };
    });

    return start;
};

const getTrainingPublicationId = (connection: Knex, trainingId: number) => {
    const query = connection.queryBuilder();

    query.select("publication_id").from("trainings").where("training_id", trainingId);

    return query;
};

// const checkIfUserAlreadyInPublication = (connection: Knex, contactId: number, publicationId: number) => {
//     const query = connection.queryBuilder();

//     query
//         .count("contact_publication_id as count")
//         .from("dp_contact_publications")
//         .where({
//             contactId: contactId,
//             publicationId: publicationId
//         });

//     return query;
// }

const addContactPublication = (connection: Knex, contactId: number, publicationId: number) => {
    const query = connection.queryBuilder();

    query
        .insert([
            {
                contact_id: contactId,
                publication_id: publicationId,
                unsubscribed: false,
                domain_id: 1,
            },
        ])
        .into("dp_contact_publications")
        .returning("*");

    return query;
};

const getPastPhysicalTrainingParticipation = (connection: Knex, contactId: number, trainingId: number) => {
    const query = connection.queryBuilder();

    query
        .count("ep.event_participant_id as count")
        .from("participants as p")
        .innerJoin("event_participants as ep", "ep.participant_id", "p.participant_id")
        .innerJoin("events as e", "e.event_id", "ep.event_id")
        .where("p.contact_id", contactId)
        .whereIn(
            "e.training_module_id",
            connection
                .select("tm.training_module_id")
                .from("training_modules as tm")
                .where("tm.training_id", trainingId)
        );

    return query;
};

const getContactCampus = (connection: Knex, contactId: number) => {
    const query = connection.queryBuilder();

    query.select("household_congregation as campus_id").from("participants").where("contact_id", contactId);

    return query;
};
