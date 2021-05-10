import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";

export const setGraphUrl = (url: string): void => {
    GraphService.getSingleton().graphRootUrl = url;
};

export const runGraphQuery = async (query: string): Promise<any> => {
    return await GraphService.getSingleton().runQuery(query);
};
