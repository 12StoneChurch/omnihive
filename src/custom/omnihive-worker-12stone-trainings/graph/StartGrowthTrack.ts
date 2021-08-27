import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { Knex } from "knex";
import { serializeError } from "serialize-error";

import { createEngagement } from "./../queries/createEngagement";
import { startTraining } from "./../queries/startTraining";

interface Args {
    contactId: number;
    trainingId: number;
}
export default class StartGrowthTrack extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<any> => {
        try {
            /* Verify auth token */
            await verifyToken(_omniHiveContext);

            if (!customArgs?.contactId) {
                throw new Error("GetAllEngagements requires a customArg of engagementId");
            }
            // Get the connection to the database
            const worker = await this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");

            // Set connection as Knex
            const connection = worker?.connection as Knex;

            // PAGE ARGS
            const { contactId, trainingId } = customArgs;

            const data = await startTraining(connection, trainingId, contactId);

            // Create engagement if the user doesn't have any training data yet
            if (!data.pastParticipation) {
                const graphUrl = this.getEnvironmentVariable("OH_WEB_ROOT_URL") + this.metadata.customUrl;

                const engagementData = {
                    contactId: contactId,
                    congregationId: data.campusId,
                    engagementTypeId: 8,
                };

                await createEngagement(engagementData, graphUrl);
            }

            return data;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
