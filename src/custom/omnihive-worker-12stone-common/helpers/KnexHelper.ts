import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { Knex } from "knex";

export const getKnex = (worker: HiveWorkerBase, dbName: string): Knex => {
    const knex: Knex | undefined = worker.getWorker<IDatabaseWorker>(HiveWorkerType.Database, dbName)?.connection;

    if (!knex) {
        throw new Error(`A database connection does not exist for dbName ${dbName}.`);
    }

    return knex;
};
