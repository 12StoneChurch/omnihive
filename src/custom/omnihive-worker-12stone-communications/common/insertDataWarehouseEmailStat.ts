import dayjs from "dayjs";
import { runGraphQuery, setGraphUrl } from "../lib/services/GraphService";

export const insertDataWarehouseEmailStat = async (
    url: string,
    contactId: number,
    typeId: number,
    eventId?: string,
    timestamp?: Date
) => {
    const query = `
        mutation {
            data: insert_dboEmailStatisticDetails(insert: [{
                mpContactId: ${contactId}
                typeId: ${typeId}
                ${eventId ? `providerEventId: "${eventId}",` : ""}
                ${timestamp ? `providerTimestamp: "${dayjs(timestamp).format("YYYY-MM-DDTHH:mm:ss")}",` : ""}
            }]) {
                emailStatisticDetailId
            }
        }
    `;

    setGraphUrl(url);

    return await runGraphQuery(query);
};
