import RemoteHiveAccountWorker from '..';
import { HiveWorkerType } from '@withonevision/omnihive-hive-common/enums/HiveWorkerType';
import { AwaitHelper } from '@withonevision/omnihive-hive-common/helpers/AwaitHelper';
import { HiveAccount } from '@withonevision/omnihive-hive-common/models/HiveAccount';
import { HiveWorkerFactory } from '@withonevision/omnihive-hive-worker/HiveWorkerFactory';
import { assert } from 'chai';
import fs from 'fs';
import { serializeError } from 'serialize-error';

const getConfigs = function (): any | undefined {
    try {
        return JSON.parse(fs.readFileSync(`${__dirname}/test.settings.json`,
            { encoding: "utf8" }));
    } catch {
        return undefined;
    }
}

describe('remote hive account worker tests', function () {
    let configs: any | undefined;
    let worker: RemoteHiveAccountWorker = new RemoteHiveAccountWorker();

    before(function () {
        configs = getConfigs();

        if (!configs) {
            this.skip();
        }
    });

    const init = async function (): Promise<void> {
        try {
            await AwaitHelper.execute(HiveWorkerFactory.getInstance()
                .init(configs));
            const newWorker = HiveWorkerFactory
                .getInstance()
                .workers
                .find((x) => x[0].type === HiveWorkerType.HiveAccount);

            if (newWorker && newWorker[1]) {
                worker = newWorker[1];
            }
        } catch (err) {
            throw new Error("init error: " + JSON.stringify(serializeError(err)));
        }
    }

    describe("Init functions", function () {
        it('test init', async function () {
            const result = await init();
            assert.isUndefined(result);
        });
    });


    describe("Worker Functions", function () {
        before(async function () {
            await init();
        });

        it("get hive account", async function () {
            const account: HiveAccount = await worker.getHiveAccount();
            const comparer: HiveAccount = {
                id: 1,
                name: 'OmniHive-Dev',
                customerId: 1,
                private: false,
                statusId: 1,
                customer: {
                    id: 1,
                    name: 'With One Vision',
                    contactId: 0
                },
                type: {
                    id: 4,
                    name: 'With One Vision'
                }
            }
            assert.deepEqual(account, comparer);
        })
    });
})