import { runGraphQuery, setGraphUrl } from "../lib/services/GraphService";

export const getContactIdByEmail = async (url: string, email: string) => {
    const query = `
        {
            data: dboContacts(where: { emailAddress: { eq:  "${email}" } }) {
                id: contactId
            }
        }
    `;

    setGraphUrl(url);

    return await runGraphQuery(query);
};
