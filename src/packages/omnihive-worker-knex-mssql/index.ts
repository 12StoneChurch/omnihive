import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { OmniHiveLogLevel } from "@withonevision/omnihive-core/enums/OmniHiveLogLevel";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { ObjectHelper } from "@withonevision/omnihive-core/helpers/ObjectHelper";
import { StringBuilder } from "@withonevision/omnihive-core/helpers/StringBuilder";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { ILogWorker } from "@withonevision/omnihive-core/interfaces/ILogWorker";
import { HiveWorker } from "@withonevision/omnihive-core/models/HiveWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { HiveWorkerMetadataDatabase } from "@withonevision/omnihive-core/models/HiveWorkerMetadataDatabase";
import { StoredProcSchema } from "@withonevision/omnihive-core/models/StoredProcSchema";
import { TableSchema } from "@withonevision/omnihive-core/models/TableSchema";
import { CommonStore } from "@withonevision/omnihive-core/stores/CommonStore";
import knex from "knex";
import sql from "mssql";
import { serializeError } from "serialize-error";

export class MssqlDatabaseWorkerMetadata extends HiveWorkerMetadataDatabase {
    public schemaName: string = "";
}

export default class MssqlDatabaseWorker extends HiveWorkerBase implements IDatabaseWorker {
    public connection!: knex;
    private connectionPool!: sql.ConnectionPool;
    private sqlConfig!: sql.config;
    private metadata!: MssqlDatabaseWorkerMetadata;
    private logWorker: ILogWorker | undefined = undefined;

    constructor() {
        super();
    }

    public async init(config: HiveWorker): Promise<void> {
        try {
            await AwaitHelper.execute<void>(super.init(config));
            this.metadata = this.checkObjectStructure<MssqlDatabaseWorkerMetadata>(
                MssqlDatabaseWorkerMetadata,
                config.metadata
            );

            this.sqlConfig = {
                user: this.metadata.userName,
                password: this.metadata.password,
                server: this.metadata.serverAddress,
                port: +this.metadata.serverPort,
                database: this.metadata.databaseName,
                options: {
                    enableArithAbort: true,
                    encrypt: false,
                },
            };

            this.connectionPool = new sql.ConnectionPool(this.sqlConfig);
            await AwaitHelper.execute<sql.ConnectionPool>(this.connectionPool.connect());

            const connectionOptions: knex.Config = { connection: {}, pool: { min: 0, max: 150 } };
            connectionOptions.client = "mssql";
            connectionOptions.connection = this.sqlConfig;
            this.connection = knex(connectionOptions);
        } catch (err) {
            throw new Error("MSSQL Init Error => " + JSON.stringify(serializeError(err)));
        }
    }

    public async afterInit(): Promise<void> {
        try {
            this.logWorker = await AwaitHelper.execute<ILogWorker | undefined>(
                CommonStore.getInstance().getHiveWorker<ILogWorker | undefined>(HiveWorkerType.Log)
            );

            if (!this.logWorker) {
                throw new Error("Log Worker Not Defined.  Database Worker Will Not Function Without Log Worker.");
            }
        } catch (err) {
            throw new Error("MSSQL Dependencies Error => " + JSON.stringify(serializeError(err)));
        }
    }

    public executeQuery = async (query: string): Promise<any[][]> => {
        this.logWorker?.write(OmniHiveLogLevel.Info, query);

        const poolRequest = this.connectionPool.request();
        const result = await AwaitHelper.execute<any>(poolRequest.query(query));
        return result.recordsets;
    };

    public executeStoredProcedure = async (
        storedProcSchema: StoredProcSchema,
        args: { name: string; value: any; isString: boolean }[]
    ): Promise<any[][]> => {
        const builder: StringBuilder = new StringBuilder();

        builder.append(`exec `);

        if (!storedProcSchema.schema || storedProcSchema.schema === "") {
            builder.append(`dbo.` + storedProcSchema.storedProcName + ` `);
        } else {
            builder.append(storedProcSchema.schema + `.` + storedProcSchema.storedProcName + ` `);
        }

        args.forEach((arg: { name: string; value: any; isString: boolean }, index: number) => {
            builder.append(`@${arg.name}=${arg.isString ? `'` : ""}${arg.value}${arg.isString ? `'` : ""}`);

            if (index < args.length - 1) {
                builder.append(`, `);
            }
        });

        return this.executeQuery(builder.outputString());
    };

    public getSchema = async (): Promise<{ tables: TableSchema[]; storedProcs: StoredProcSchema[] }> => {
        const result: { tables: TableSchema[]; storedProcs: StoredProcSchema[] } = {
            tables: [],
            storedProcs: [],
        };

        const tableResult = await AwaitHelper.execute<any[][]>(this.executeQuery("exec oh_get_schema"));
        const storedProcResult = await AwaitHelper.execute<any[][]>(
            this.executeQuery("exec oh_get_stored_proc_schema")
        );

        result.tables = ObjectHelper.createArray(TableSchema, tableResult[0]);
        result.storedProcs = ObjectHelper.createArray(StoredProcSchema, storedProcResult[0]);

        return result;
    };
}
