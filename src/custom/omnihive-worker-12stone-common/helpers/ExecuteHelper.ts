import { validateArgs } from "@12stonechurch/omnihive-worker-common/helpers/ArgsHelper";
import { getCustomGraphConnection } from "@12stonechurch/omnihive-worker-common/helpers/GraphHelper";
import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";
import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { Schema } from "joi";
import { Knex } from "knex";

import { getKnex } from "./KnexHelper";

interface GetExecuteContextOpts {
    worker: HiveWorkerBase;
    context: GraphContext;
    rawArgs: unknown;
    argsSchema?: Schema;
}

interface ExecuteContext<T = void> {
    args: T;
    knex: Knex;
    customGraph: GraphService;
}

export const getExecuteContext = async <T = void>(opts: GetExecuteContextOpts): Promise<ExecuteContext<T>> => {
    await verifyToken(opts.context);

    let args: T;

    if (opts.argsSchema) {
        args = validateArgs<T>(opts.rawArgs, opts.argsSchema);
    } else {
        args = opts.rawArgs as T;
    }

    const knex = getKnex(opts.worker, "dbMinistryPlatform");
    const customGraph = await getCustomGraphConnection(opts.worker);

    return {
        args,
        knex,
        customGraph,
    };
};
