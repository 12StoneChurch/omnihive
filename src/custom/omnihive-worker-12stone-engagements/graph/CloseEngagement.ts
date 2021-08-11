/// <reference path="../../../types/globals.omnihive.d.ts" />
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { Knex } from "knex";
import { serializeError } from "serialize-error";

import { EngagementContactLogWorkerArgs } from "../graph/CreateEngagementContactLog";
import { UpdateEngagementWorkerArgs } from "../graph/UpdateEngagement";

interface CloseEngagementWorkerArgs {
    engagement: {
        engagementId: number;
        engagementStatusId?: number;
    };
    contactLog: {
        engagementId: number;
        description: string;
        createdByContactId: number;
    };
}

export default class CloseEngagement extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: CloseEngagementWorkerArgs, _omniHiveContext: GraphContext): Promise<{}> => {
        try {
            // Get the connection to the database
            const worker = await this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");

            // Set connection as Knex
            const connection = worker?.connection as Knex;
            const graphUrl = this.getEnvironmentVariable("OH_WEB_ROOT_URL") + this.metadata.customUrl;

            const closeEngagementTransaction = await connection.transaction(async (trx) => {
                // 1. Closes engagement - updates engagement and creates engagement log
                const closedEngagement = await updateEngagement(customArgs.engagement, graphUrl).catch((e) => {
                    trx.rollback();
                    throw e;
                });

                // 2. Creates contact log and engagement contact log
                await createEngagementContactLog(customArgs.contactLog, graphUrl).catch((e) => {
                    trx.rollback();
                    throw e;
                });

                return closedEngagement.UpdateEngagement;
            });

            return closeEngagementTransaction;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            throw err;
        }
    };
}

const updateEngagement = async (customArgs: UpdateEngagementWorkerArgs, graphUrl: string) => {
    try {
        const query = `
        {
          UpdateEngagement(customArgs: {
            engagementId: ${customArgs.engagementId},
            engagementStatusId: 4
          })
        }
        `;
        return await global.omnihive.serverClient.graphClient(graphUrl, query);
    } catch (err) {
        throw Error(err);
    }
};

const createEngagementContactLog = async (customArgs: EngagementContactLogWorkerArgs, graphUrl: string) => {
    try {
        const query = `
        {
          CreateEngagementContactLog(customArgs: {
            engagementId: ${customArgs.engagementId},
            description: "${customArgs.description}",
            createdByContactId: ${customArgs.createdByContactId}
          })
        }
        `;
        return await global.omnihive.serverClient.graphClient(graphUrl, query);
    } catch (err) {
        throw Error(err);
    }
};
