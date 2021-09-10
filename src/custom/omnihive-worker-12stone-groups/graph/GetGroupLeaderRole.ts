import { errorHelper } from "@12stonechurch/omnihive-worker-common/helpers/ErrorHelper";
import { getExecuteContext } from "@12stonechurch/omnihive-worker-common/helpers/ExecuteHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import j from "joi";

import { countLeaderGroups } from "../queries/countLeaderGroups";
import { getContact } from "../queries/getContact";

interface Args {
    contactId: number;
}

const argsSchema = j.object({ contactId: j.number().integer().positive().required() });

export default class GetGroupLeaderRole extends HiveWorkerBase implements IGraphEndpointWorker {
    execute = async (rawArgs: unknown, context: GraphContext): Promise<{ isLeader: boolean } | Error> => {
        try {
            const { args, knex, customGraph } = await getExecuteContext<Args>({
                worker: this,
                context,
                rawArgs,
                argsSchema,
            });

            const { participantId } = await getContact(customGraph, { ...args });

            if (participantId) {
                const leaderGroupCount = await countLeaderGroups(knex, { participantId });

                if (leaderGroupCount > 0) {
                    return { isLeader: true };
                }
            }

            return { isLeader: false };
        } catch (err) {
            return errorHelper(err);
        }
    };
}
