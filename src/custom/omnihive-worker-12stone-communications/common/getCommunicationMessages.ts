import { runGraphQuery, setGraphUrl } from "../lib/services/GraphService";

export const getMessages = async (url: string): Promise<any> => {
    const query = `
        query {   
            data: storedProcedures {
                proc: api_12Stone_Custom_CommunicationManager_RunMessageQueue(
                    DomainId: "1", 
                    RecipientListMinimum: 0, 
                    RecipientListMaximum: 10000, 
                    UserId: 5690
                )
            }
        }`;

    setGraphUrl(url);

    return (await runGraphQuery(query)).data[0].proc[0];
};
