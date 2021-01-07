import { HiveWorkerType } from '@withonevision/omnihive-hive-common/enums/HiveWorkerType';
import { OmniHiveLogLevel } from '@withonevision/omnihive-hive-common/enums/OmniHiveLogLevel';
import { AwaitHelper } from '@withonevision/omnihive-hive-common/helpers/AwaitHelper';
import { HiveWorker } from '@withonevision/omnihive-hive-common/models/HiveWorker';
import { StoredProcSchema } from '@withonevision/omnihive-hive-common/models/StoredProcSchema';
import { TableSchema } from '@withonevision/omnihive-hive-common/models/TableSchema';
import { HiveWorkerFactory } from '@withonevision/omnihive-hive-worker/HiveWorkerFactory';
import { IKnexDatabaseWorker } from '@withonevision/omnihive-hive-worker/interfaces/IKnexDatabaseWorker';
import { ILogWorker } from '@withonevision/omnihive-hive-worker/interfaces/ILogWorker';
import { HiveWorkerBase } from '@withonevision/omnihive-hive-worker/models/HiveWorkerBase';
import knex from 'knex';
import { serializeError } from 'serialize-error';

export class SqliteDatabaseWorkerMetadata {
    public filePath: string = "";
}

export default class SqliteDatabaseWorker extends HiveWorkerBase implements IKnexDatabaseWorker {

    public connection!: knex;
    private logWorker: ILogWorker | undefined = undefined;

    constructor() {
        super();
    }

    public async init(config: HiveWorker): Promise<void> {
        try {
            await AwaitHelper.execute<void>(super.init(config));
            const metadata = this.hiveWorkerHelper.checkMetadata<SqliteDatabaseWorkerMetadata>(SqliteDatabaseWorkerMetadata, config.metadata);

            const connectionOptions: knex.Config = { client: "sqlite3", connection: { filename: metadata.filePath } };
            this.connection = knex(connectionOptions);
        } catch (err) {
            throw new Error("SQLite Init Error => " + JSON.stringify(serializeError(err)));
        }

    }

    public async afterInit(): Promise<void> {
        try {
            this.logWorker = await AwaitHelper.execute<ILogWorker | undefined>(HiveWorkerFactory.getInstance().getHiveWorker<ILogWorker | undefined>(HiveWorkerType.Log));

            if (!this.logWorker) {
                throw new Error("Log Worker Not Defined.  Database Worker Will Not Function Without Log Worker.");
            }
        } catch (err) {
            throw new Error("SQLite Dependencies Error => " + JSON.stringify(serializeError(err)));
        }
    }

    public executeQuery = async (query: string): Promise<any[][]> => {

        this.logWorker?.write(OmniHiveLogLevel.Debug, query);
        const result = await AwaitHelper.execute<any>(this.connection.raw(query));
        return result.recordsets;
    }

    public executeStoredProcedure = async (_storedProcSchema: StoredProcSchema, _args: { name: string, value: any, isString: boolean }[]): Promise<any[][]> => {
        throw new Error("SQLite does not support stored prcedures")
    }

    public getSchema = async (): Promise<{ tables: TableSchema[], storedProcs: StoredProcSchema[] }> => {
        const result: { tables: TableSchema[], storedProcs: StoredProcSchema[] } = {
            tables: [],
            storedProcs: [],
        };

        const tableSql: string = `select name from sqlite_master where type = 'table' and name not like 'sqlite%'`;
        // to get fields, loop table name and do `PRAGMA table_info(${tableName});`
        const tableResult = await AwaitHelper.execute<any[][]>(this.executeQuery(tableSql));
        console.log(tableResult);

        return result;
    }
}