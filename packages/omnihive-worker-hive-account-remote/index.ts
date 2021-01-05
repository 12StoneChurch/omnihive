import { OmniHiveClient } from "@withonevision/omnihive-public-client";
import { AwaitHelper } from "@withonevision/omnihive-hive-common/helpers/AwaitHelper";
import { ClientSettings } from "@withonevision/omnihive-hive-common/models/ClientSettings";
import { HiveAccount } from "@withonevision/omnihive-hive-common/models/HiveAccount";
import { IHiveAccountWorker } from "@withonevision/omnihive-hive-worker/interfaces/IHiveAccountWorker";
import { HiveWorker } from "@withonevision/omnihive-hive-common/models/HiveWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-hive-worker/models/HiveWorkerBase";

export default class RemoteHiveAccountWorker extends HiveWorkerBase implements IHiveAccountWorker {

    private client: OmniHiveClient = new OmniHiveClient();
    private account!: HiveAccount;

    constructor() {
        super();
    }
    
    public async init(config: HiveWorker): Promise<void> {
        await AwaitHelper.execute<void>(super.init(config));
        const metadata: ClientSettings = this.hiveWorkerHelper.checkMetadata<ClientSettings>(ClientSettings, config.metadata);

        this.account = await AwaitHelper.execute<HiveAccount>(this.client.init(
            metadata.accountName, metadata.clientId, metadata.clientSecret, metadata.dataRootUrl, metadata.hiveRootUrl));
    }

    public getHiveAccount = async (): Promise<HiveAccount> => {
        return this.account;
    }
}
