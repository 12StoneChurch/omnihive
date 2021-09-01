import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import dayjs from "dayjs";
import { Knex } from "knex";
import { serializeError } from "serialize-error";

interface Args {
    userId: number;
    trainingSubModuleId: number;
}
export default class CreateTrainingProgress extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<any> => {
        try {
            /* Verify auth token */
            await verifyToken(_omniHiveContext);

            if (!customArgs?.userId || !customArgs?.trainingSubModuleId) {
                throw new Error("CreateTrainingProgress requires customArgs of userId & trainingSubModuleId");
            }
            // Get the connection to the database
            const worker = await this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");

            // Set connection as Knex
            const connection = worker?.connection as Knex;

            // PAGE ARGS
            const { userId, trainingSubModuleId } = customArgs;
            const existingRecords = await checkForExistingRecord(connection, userId, trainingSubModuleId);

            // Only add a record if one doesn't already exist
            if (existingRecords[0].count <= 0) {
                const insertion = await insertProgress(connection, userId, trainingSubModuleId);
                console.log(`insertion`, insertion);
                return insertion;
            } else {
                throw Error(
                    `User ${userId} already has an existing record in training_user_progress for trainingSubmodule ${trainingSubModuleId}`
                );
            }
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

const insertProgress = (connection: Knex, userId: number, trainingSubModuleId: number) => {
    const query = connection.queryBuilder();
    query
        .insert({
            user_id: userId,
            training_submodule_id: trainingSubModuleId,
            completion_date: dayjs().toISOString(),
            domain_id: 1,
        })
        .into("training_user_progress")
        .returning("*");

    return query;
};

const checkForExistingRecord = (connection: Knex, userId: number, trainingSubModuleId: number) => {
    const query = connection.queryBuilder();

    query
        .count("training_user_progress_id as count")
        .from("training_user_progress")
        .where({ user_id: userId, training_submodule_id: trainingSubModuleId });

    return query;
};
