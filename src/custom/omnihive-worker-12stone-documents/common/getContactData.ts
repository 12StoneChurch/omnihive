import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";

export const getContactData = async (url: string, id: number): Promise<any> => {
    const query = `
        {
            data: GetContact(customArgs: { contactId: ${id} })
        }
    `;

    return (await AwaitHelper.execute(global.omnihive.serverClient.graphClient(url, query))).data;
};
