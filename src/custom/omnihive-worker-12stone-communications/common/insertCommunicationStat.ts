import dayjs from "dayjs";
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
            data: insert_CommunicationManagerStatisticsDetails(communicationManagerStatisticsDetails: {
                communication: ${commId},
                contactId: ${contactId},
                statisticsType: ${typeId},
                ${eventId ? `providerEventId: "${eventId}",` : ""}
                ${timestamp ? `providerTimestamp: "${dayjs(timestamp).format("YYYY-MM-DDTHH:mm:ss")}",` : ""}
                domainId: 1
              }) {
                  id: communicationManagerStatisticsDetailId
              }
        }
    `;

    setGraphUrl(url);

    return await runGraphQuery(query);
};
