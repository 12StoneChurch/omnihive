/// <reference path="../../../types/globals.omnihive.d.ts" />

import { OmniHiveClient } from "@withonevision/omnihive-client";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { serializeError } from "serialize-error";
import { RegisteredHiveWorker } from "@withonevision/omnihive-core/models/RegisteredHiveWorker";
import { EnvironmentVariable } from "@withonevision/omnihive-core/models/EnvironmentVariable";

export class GraphService {
    public graphRootUrl: string = "";

    private static singleton: GraphService;

    public static getSingleton = (): GraphService => {
        if (!GraphService.singleton) {
            GraphService.singleton = new GraphService();
        }

        return GraphService.singleton;
    };

    public init = async (workers: RegisteredHiveWorker[], environmentVariables: EnvironmentVariable[]) => {
        try {
            await OmniHiveClient.getSingleton().init(workers, environmentVariables);
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };

    public runQuery = async (query: string, retry: boolean = false): Promise<any> => {
        try {
            if (!query) {
                throw new Error("A query is required.");
            }

            const results = await AwaitHelper.execute(
                OmniHiveClient.getSingleton().graphClient(this.graphRootUrl, query)
            );
            return results;
        } catch (err) {
            if (err.message.includes("Connection is closed.") && !retry) {
                await this.runQuery(query, true);
            } else {
                throw new Error(JSON.stringify(serializeError(err)));
            }
        }
    };

    public runCustomSql = async (query: string): Promise<any> => {
        try {
            if (!query) {
                throw new Error("A query is required.");
            }

            const results = await AwaitHelper.execute(
                OmniHiveClient.getSingleton().runCustomSql(this.graphRootUrl, query)
            );

            return results;
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };
}
