import PusherPubSubServerWorker from '..';
import { HiveWorkerType } from '@withonevision/omnihive-hive-common/enums/HiveWorkerType';
import { AwaitHelper } from '@withonevision/omnihive-hive-common/helpers/AwaitHelper';
import { HiveWorkerFactory } from '@withonevision/omnihive-hive-worker/HiveWorkerFactory';
import { assert } from 'chai';
import fs from 'fs';
import { serializeError } from 'serialize-error';
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

const getConfigs = function (): any | undefined {
    try {
        if (!process.env.OH_ENV_FILE) {
            return undefined;
        }

        dotenvExpand(dotenv.config({ path: process.env.OH_ENV_FILE }));

        return JSON.parse(fs.readFileSync(`${process.env.OH_TEST_WORKER_PUBSUBSERVER_PUSHER}`,
            { encoding: "utf8" }));
    } catch {
        return undefined;
    }
}


describe('pubsub server worker tests', function () {
    let configs: any | undefined;
    let worker: PusherPubSubServerWorker = new PusherPubSubServerWorker();

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
                .find((x) => x[0].type === HiveWorkerType.PubSubServer);

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

        it("emit", async function () {
            try {
                const result = await worker.emit("jest-test-channel", "successful test", {})
                assert.isUndefined(result);
            } catch (err) {
                throw new Error("emit error: " + JSON.stringify(serializeError(err)));
            }
        });

        // TODO: Check client to make sure emitted message was received.
    });
})