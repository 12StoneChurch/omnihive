import { Knex } from "knex";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";

export async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getMutationPropsString(props: Record<string, unknown>) {
    let mutationString = ``;

    for (const prop in props) {
        if (props[prop] !== null || props[prop] !== undefined) {
            if (typeof props[prop] === "string") {
                mutationString += `${prop}: "${props[prop]}"\n`;
            } else if (typeof props[prop] === "number" || typeof props[prop] === "boolean") {
                mutationString += `${prop}: ${props[prop]}\n`;
            }
        }
    }

    return mutationString;
}

export const getDatabaseObjects = (
    worker: HiveWorkerBase,
    dbWorkerName: string
): { databaseWorker: IDatabaseWorker; knex: Knex; queryBuilder: Knex.QueryBuilder<any, any> } => {
    const databaseWorker: IDatabaseWorker | undefined = worker.getWorker<IDatabaseWorker>(
        HiveWorkerType.Database,
        dbWorkerName ?? undefined
    );

    if (!databaseWorker) {
        throw new Error("The database worker is not configured properly");
    }

    const knex: Knex = databaseWorker.connection;

    if (!knex) {
        throw new Error("Knex did not initialize properly.");
    }

    return {
        databaseWorker: databaseWorker,
        knex: knex,
        queryBuilder: knex.queryBuilder(),
    };
};

export const addDataToObject = <T extends unknown>(type: { new (): T }, target: any, data: any) => {
    const generic: T = new type();

    Object.keys(data).forEach((key) => {
        // @ts-ignore
        if (key in generic) {
            target[key] = data[key];
        }
    });
};
