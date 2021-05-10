import { runGraphQuery, setGraphUrl } from "../lib/services/GraphService";

export const insertCommunicationStat = async (
    url: string,
    commId: number,
    contactId: number,
    typeId: number,
    eventId?: string,
    timestamp?: Date
) => {
    const query = `
        mutation {
            insert_CommunicationManagerStatisticsDetails(communicationManagerStatisticsDetails: {
                communication: ${commId},
                contactId: ${contactId},
                statisticsType: ${typeId}
                ${eventId ? `,providerEventId: ${eventId}` : ""}
                ${timestamp ? `,providerTimestamp: ${timestamp}` : ""}
              })
        }
    `;

    setGraphUrl(url);

    return await runGraphQuery(query);
};
