import { runGraphQuery, setGraphUrl } from "../lib/services/GraphService";

export const updateCommunicationMessageStatus = async (
    graphUrl: string,
    id: number,
    contactId: number,
    statusId: number = 0,
    actionText: string = "",
    twilioSid: string = ""
) => {
    if (!id || !contactId) {
        throw new Error("Missing CommunicationId or ContactId");
    }

    if (!statusId && !actionText && !twilioSid) {
        throw new Error("Must provide at least one piece of data to update");
    }

    const query = `
        mutation {
            data: update_DpCommunicationMessage(updateObject: {
                ${statusId ? `actionStatusId: ${statusId},` : ""}
                ${actionText ? `actionText: "${actionText}",` : ""}
                ${twilioSid ? `replyTo: "${twilioSid}",` : ""}
            }, 
            whereObject: {
                communicationId: "= ${id}",
                contactId: "= ${contactId}"
            })
        }
        `;

    setGraphUrl(graphUrl);

    const response = await runGraphQuery(query);

    return response.data === 1;
};
