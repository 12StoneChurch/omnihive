import { runGraphQuery } from "../lib/services/GraphService";

export const addContactPublications = async (contactIds: number[], publicationId: number) => {
    const insert = `
        mutation {
            insert_DpContactPublications(dpContactPublications: [${contactIds
                .map(
                    (id) => `{
                                contactId: ${id}
                                publicationId: ${publicationId}
                                unsubscribed: false
                                domainId: 1
                            }`
                )
                .join("\n")}]) {
                contactPublicationId
            }
        }
    `;

    await runGraphQuery(insert);
};
