import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { serializeError } from "serialize-error";
import { RegisteredHiveWorker } from "@withonevision/omnihive-core/models/RegisteredHiveWorker";

export const setGraphUrl = (url: string): void => {
    GraphService.getSingleton().graphRootUrl = url;
};

export const runGraphQuery = async (query: string): Promise<any> => {
    try {
        return await GraphService.getSingleton().runQuery(query);
    } catch (err) {
        throw new Error(JSON.stringify(serializeError(err)));
    }
};

export const runCustomSql = async (query: string, encryptionWorker: string = ""): Promise<any> => {
    try {
        return await GraphService.getSingleton().runCustomSql(query, encryptionWorker);
    } catch (err) {
        throw new Error(JSON.stringify(serializeError(err)));
    }
};

export const init = async (workers: RegisteredHiveWorker[]) => {
    await GraphService.getSingleton().init(workers);
};
