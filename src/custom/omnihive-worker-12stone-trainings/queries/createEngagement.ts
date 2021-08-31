/// <reference path="../../../types/globals.omnihive.d.ts" />

interface Data {
    contactId: number;
    congregationId: number;
    engagementTypeId: number;
}
export const createEngagement = async (data: Data, graphUrl: string) => {
    try {
        const query = `
          query {
            CreateEngagement(customArgs: {
              contactId: ${data.contactId},
              congregationId: ${data.congregationId},
              engagementTypeId: ${data.engagementTypeId},
              engagementStatusId: 1
            })
          }
        `;

        return await global.omnihive.serverClient.graphClient(graphUrl, query);
    } catch (err) {
        throw Error(err);
    }
};
