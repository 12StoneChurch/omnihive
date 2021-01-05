import { ObjectHelper } from "@withonevision/omnihive-hive-common/helpers/ObjectHelper";
import { StringHelper } from "@withonevision/omnihive-hive-common/helpers/StringHelper";
import { HiveWorker } from "@withonevision/omnihive-hive-common/models/HiveWorker";

export class HiveWorkerHelper {

    protected config!: HiveWorker;

    constructor(config: HiveWorker) {
        this.config = config;
    }

    public checkMetadata = <T extends object>(type: { new (): T }, model: any | null): T => {

        const metadata: T = ObjectHelper.createStrict<T>(type, model);
        const metaAny: any = metadata as any;

        Object.keys(metadata).forEach((key: string) => {
            if(!metaAny[key]) {
                throw new Error(`Metadata key ${key} is null or undefined on hive worker ${this.config.name}`);
            }

            if (metaAny[key] && typeof metaAny[key] === "string" && StringHelper.isNullOrWhiteSpace(metaAny[key])) {
                throw new Error(`Metadata key ${key} is a string but it is blank on hive worker ${this.config.name}`);
            }

            if (metaAny[key] && Array.isArray(metaAny[key])) {
                if ((metaAny[key] as Array<any>).length === 0) {
                    throw new Error(`Metadata key ${key} is an array but it is empty on hive worker ${this.config.name}`);
                }
            }
        });

        return metadata;
    }
}