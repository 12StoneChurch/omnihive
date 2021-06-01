import { runGraphQuery } from "../lib/services/GraphService";

export const addContactPublication = async (contactId: number, publicationId: number) => {
    const insert = `
        mutation {
            insert_DpContactPublications(dpContactPublications: {
            contactId: ${contactId}
            publicationId: ${publicationId}
            unsubscribed: false
            domainId: 1
            }) {
                contactPublicationId
            }
        }
    `;

    await runGraphQuery(insert);
};
