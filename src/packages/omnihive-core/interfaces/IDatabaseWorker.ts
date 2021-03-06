import { StoredProcSchema } from "../models/StoredProcSchema";
import { TableSchema } from "../models/TableSchema";
import { IHiveWorker } from "./IHiveWorker";

export interface IDatabaseWorker extends IHiveWorker {
    connection: any;
    executeQuery: (query: string) => Promise<any[][]>;
    executeStoredProcedure: (
        storedProcSchema: StoredProcSchema,
        args: { name: string; value: any; isString: boolean }[]
    ) => Promise<any[][]>;
    getSchema: () => Promise<{ tables: TableSchema[]; storedProcs: StoredProcSchema[] }>;
}
