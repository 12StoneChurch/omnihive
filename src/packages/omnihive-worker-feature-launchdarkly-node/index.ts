import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { OmniHiveLogLevel } from "@withonevision/omnihive-core/enums/OmniHiveLogLevel";
import { CoreServiceFactory } from "@withonevision/omnihive-core/factories/CoreServiceFactory";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IFeatureWorker } from "@withonevision/omnihive-core/interfaces/IFeatureWorker";
import { ILogWorker } from "@withonevision/omnihive-core/interfaces/ILogWorker";
import { HiveWorker } from "@withonevision/omnihive-core/models/HiveWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import LaunchDarkly, { LDUser } from "launchdarkly-node-server-sdk";
import { serializeError } from "serialize-error";

type LaunchDarklyFeatureClient = {
    clientSideId: string;
    instance: LaunchDarkly.LDClient;
    mobileKey: string;
    project: string;
    ready: boolean;
    sdkKey: string;
};

type LaunchDarklyFeature = {
    name: string;
    value: any;
};

export class LaunchDarklyNodeFeatureWorkerMetadata {
    public clientSideId: string = "";
    public mobileKey: string = "";
    public project: string = "";
    public sdkKey: string = "";
    public user: string = "";
}

export default class LaunchDarklyNodeFeatureWorker extends HiveWorkerBase implements IFeatureWorker {
    private client!: LaunchDarklyFeatureClient;
    private features: LaunchDarklyFeature[] = [];
    private user!: LDUser;
    private project!: string;
    private logWorker: ILogWorker | undefined = undefined;

    constructor() {
        super();
    }

    public async init(config: HiveWorker): Promise<void> {
        try {
            await AwaitHelper.execute<void>(super.init(config));
            const metadata: LaunchDarklyNodeFeatureWorkerMetadata = this.checkObjectStructure<LaunchDarklyNodeFeatureWorkerMetadata>(
                LaunchDarklyNodeFeatureWorkerMetadata,
                config.metadata
            );

            const ldInstance: LaunchDarkly.LDClient = LaunchDarkly.init(metadata.sdkKey);

            const featureClient: LaunchDarklyFeatureClient = {
                clientSideId: metadata.clientSideId,
                mobileKey: metadata.mobileKey,
                project: metadata.project,
                sdkKey: metadata.sdkKey,
                instance: ldInstance,
                ready: false,
            };
            this.user = { key: metadata.user };
            this.project = metadata.project;

            featureClient.instance.on("ready", () => {
                featureClient.ready = true;
                this.client = featureClient;
            });
        } catch (err) {
            throw new Error("Launch Darkly Init Error => " + JSON.stringify(serializeError(err)));
        }
    }

    public async afterInit(): Promise<void> {
        this.logWorker = await AwaitHelper.execute<ILogWorker | undefined>(
            CoreServiceFactory.workerService.getWorker<ILogWorker | undefined>(HiveWorkerType.Log)
        );

        if (!this.logWorker) {
            throw new Error("Log Worker Not Defined.  Feature worker Will Not Function Without Log Worker.");
        }
    }

    public get = async <T extends unknown>(name: string, defaultValue?: unknown): Promise<T | undefined> => {
        if (!name || name.length <= 0) {
            throw new Error("No feature name given.");
        }

        const feature: LaunchDarklyFeature[] = this.features.filter((ff: LaunchDarklyFeature) => ff.name === name);

        if (feature.length > 0) {
            this.logWorker?.write(
                OmniHiveLogLevel.Info,
                `Feature Evaluated => Project: ${this.project} => Flag: ${name} => Value: ${feature[0].value as string}`
            );
            return feature[0].value as T;
        }

        let value: any;

        try {
            value = await AwaitHelper.execute<any>(this.client.instance.variation(name, this.user, defaultValue));
        } catch (err) {
            throw new Error("Failed to retrieve feature.");
        }

        this.features.push({ name, value });

        this.client?.instance?.on(`update:${name}`, () => {
            this.client?.instance?.variation(name, this.user, defaultValue).then((newValue) => {
                this.logWorker?.write(
                    OmniHiveLogLevel.Info,
                    `Feature Changed => Project: ${this.project} => Flag: ${name} => New Value: ${newValue as string}`
                );

                const changeFeature: LaunchDarklyFeature[] = this.features.filter(
                    (ff: LaunchDarklyFeature) => ff.name === name
                );

                if (changeFeature.length === 0) {
                    this.features.push({ name, value: newValue });
                } else {
                    this.features.filter((ff: LaunchDarklyFeature) => ff.name === name)[0].value = newValue;
                }
            });
        });

        this.logWorker?.write(
            OmniHiveLogLevel.Info,
            `Feature Evaluated and Listening => Project: ${this.project} => Flag: ${name} => Value: ${value as string}`
        );

        return value as T;
    };
}