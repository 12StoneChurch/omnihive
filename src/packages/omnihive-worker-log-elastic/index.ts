import { ApiResponse, Client } from "@elastic/elasticsearch";
import { Context } from "@elastic/elasticsearch/lib/Transport";
import { OmniHiveLogLevel } from "@withonevision/omnihive-core/enums/OmniHiveLogLevel";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { ILogWorker } from "@withonevision/omnihive-core/interfaces/ILogWorker";
import { HiveWorker } from "@withonevision/omnihive-core/models/HiveWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";

export class ElasticLogWorkerMetadata {
    public cloudId: string = "";
    public cloudPassword: string = "";
    public cloudUser: string = "";
    public logIndex: string = "";
}

export default class ElasticLogWorker extends HiveWorkerBase implements ILogWorker {
    private elasticClient!: Client;
    private logIndex!: string;

    constructor() {
        super();
    }

    public async init(config: HiveWorker): Promise<void> {
        await AwaitHelper.execute<void>(super.init(config));
        const metadata: ElasticLogWorkerMetadata = this.checkObjectStructure<ElasticLogWorkerMetadata>(
            ElasticLogWorkerMetadata,
            config.metadata
        );

        this.logIndex = metadata.logIndex;

        this.elasticClient = new Client({
            cloud: {
                id: metadata.cloudId,
            },
            auth: {
                username: metadata.cloudUser,
                password: metadata.cloudPassword,
            },
        });

        this.elasticClient.indices
            .exists({ index: metadata.logIndex })
            .then((indexExists: ApiResponse<boolean, Context>) => {
                if (!indexExists.body) {
                    this.elasticClient.indices.create({ index: metadata.logIndex });
                }
            });
    }

    public write = async (logLevel: OmniHiveLogLevel, logString: string): Promise<void> => {
        const logDate = new Date();

        try {
            this.elasticClient.index({
                index: this.logIndex,
                body: {
                    logDate,
                    severity: logLevel,
                    logString: logString,
                },
            });
        } catch {
            throw new Error("Elastic log could not be synchronized");
        }
    };
}
