import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { HiveWorker } from "@withonevision/omnihive-core/models/HiveWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import cloudinary from "cloudinary";

export class CloudinaryWorkerMetadata {
    public cloudName: string = "";
    public apiKey: string = "";
    public apiSecret: string = "";
    public environment: string = "";
}

export default class CloudinaryWorker extends HiveWorkerBase {
    private metadata!: CloudinaryWorkerMetadata;
    private client = cloudinary.v2;

    constructor() {
        super();
    }

    public async init(config: HiveWorker): Promise<void> {
        await AwaitHelper.execute<void>(super.init(config));
        this.metadata = this.checkObjectStructure<CloudinaryWorkerMetadata>(CloudinaryWorkerMetadata, config.metadata);

        if (this.metadata) {
            this.client.config({
                cloud_name: this.metadata.cloudName,
                api_key: this.metadata.apiKey,
                api_secret: this.metadata.apiSecret,
                force_version: false,
            });
        }
    }

    public getMpImageUrl(uniqueName: string, customTransformations?: any): string {
        const path: string = `${this.metadata.environment}/mpfiles/${uniqueName}`;
        const url = this.client.url(path, {
            transformation: {
                format: "auto",
                width: "auto",
                quality: "auto",
                ...customTransformations,
            },
        });

        return url;
    }

    public async search(expression: string, sortBy: {key: string, orderBy: "asc" | "desc"},
        maxResults: number, nextCursor: string, withFields: string, aggregate: string) {
            
        const search = this.client.search.expression(expression).max_results(maxResults ?? 500);

        search;
        
        if (sortBy) {
            search.sort_by(sortBy.key, sortBy.orderBy)
        }

        if (nextCursor) {
            search.next_cursor(nextCursor);
        }

        if (withFields) {
            search.with_field(withFields);
        }

        if (aggregate) {
            search.aggregate(aggregate);
        }

        return await search.execute();
    }
}
