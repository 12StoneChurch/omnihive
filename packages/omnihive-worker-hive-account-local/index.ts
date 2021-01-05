import { HiveWorkerType } from '@withonevision/omnihive-hive-common/enums/HiveWorkerType';
import { AwaitHelper } from '@withonevision/omnihive-hive-common/helpers/AwaitHelper';
import { ObjectHelper } from '@withonevision/omnihive-hive-common/helpers/ObjectHelper';
import { ClientSettings } from '@withonevision/omnihive-hive-common/models/ClientSettings';
import { Customer } from '@withonevision/omnihive-hive-common/models/Customer';
import { HiveAccount } from '@withonevision/omnihive-hive-common/models/HiveAccount';
import { HiveAccountType } from '@withonevision/omnihive-hive-common/models/HiveAccountType';
import { HiveWorker } from '@withonevision/omnihive-hive-common/models/HiveWorker';
import { OmniHiveConstants } from '@withonevision/omnihive-hive-common/models/OmniHiveConstants';
import { HiveWorkerFactory } from '@withonevision/omnihive-hive-worker/HiveWorkerFactory';
import { IHiveAccountWorker } from '@withonevision/omnihive-hive-worker/interfaces/IHiveAccountWorker';
import { IKnexDatabaseWorker } from '@withonevision/omnihive-hive-worker/interfaces/IKnexDatabaseWorker';
import { HiveWorkerBase } from '@withonevision/omnihive-hive-worker/models/HiveWorkerBase';


export default class LocalHiveAccountWorker extends HiveWorkerBase implements IHiveAccountWorker {

    private metadata!: ClientSettings;
    private databaseWorker!: IKnexDatabaseWorker;

    constructor() {
        super();
    }

    public async init(config: HiveWorker): Promise<void> {

        await AwaitHelper.execute<void>(super.init(config));
        this.metadata = this.hiveWorkerHelper.checkMetadata<ClientSettings>(ClientSettings, config.metadata);
    }

    public async handleDependencies(): Promise<void> {

        const databaseWorker: IKnexDatabaseWorker | undefined = await AwaitHelper.execute<IKnexDatabaseWorker | undefined>(
            HiveWorkerFactory.getInstance().getHiveWorker<IKnexDatabaseWorker>(HiveWorkerType.Database, OmniHiveConstants.OMNIHIVE_DATABASE_WORKER_INSTANCE));

        if (!databaseWorker) {
            throw new Error(`Database Worker ${OmniHiveConstants.OMNIHIVE_DATABASE_WORKER_INSTANCE} Not Found`);
        }

        this.databaseWorker = databaseWorker;
        
    }

    public getHiveAccount = async (): Promise<HiveAccount> => {

        const queryAccount = this.databaseWorker.connection.queryBuilder();

        queryAccount.from("oh_accounts as oa");
        queryAccount.select("oa.id", "oa.name", "oa.customer_id as customerId", "oa.status_id as statusId", "oa.private");
        queryAccount.where("oa.name", this.metadata.accountName);

        const accountResults = await AwaitHelper.execute<any[][]>(this.databaseWorker.executeQuery(queryAccount.toString()));

        const queryCustomer = this.databaseWorker.connection.queryBuilder();

        queryCustomer.from("oh_customers as oc");
        queryCustomer.innerJoin("oh_accounts as oa", "oc.id", "oa.customer_id");
        queryCustomer.select("oc.id", "oc.name", "oc.contact_id as contactId");
        queryCustomer.where("oa.name", this.metadata.accountName);

        const customerResults = await AwaitHelper.execute<any[][]>(this.databaseWorker.executeQuery(queryCustomer.toString()));

        const queryType = this.databaseWorker.connection.queryBuilder();

        queryType.from("oh_account_types as oat");
        queryType.innerJoin("oh_accounts as oa", "oat.id", "oa.type_id");
        queryType.select("oat.id", "oat.name");
        queryType.where("oa.name", this.metadata.accountName);

        const accountTypeResults = await AwaitHelper.execute<any[][]>(this.databaseWorker.executeQuery(queryType.toString()));

        const account: HiveAccount = ObjectHelper.createStrict(HiveAccount, accountResults[0][0]);
        account.customer = ObjectHelper.createStrict(Customer, customerResults[0][0]);
        account.type = ObjectHelper.create(HiveAccountType, accountTypeResults[0][0]);

        if (!account.customer.contactId) {
            account.customer.contactId = 0;
        }

        return account;
    }
}
