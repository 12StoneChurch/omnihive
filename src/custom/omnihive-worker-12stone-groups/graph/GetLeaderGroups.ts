import { getExecuteContext } from "@12stonechurch/omnihive-worker-common/helpers/ExecuteHelper";
import { DanyService } from "@12stonechurch/omnihive-worker-common/services/DanyService";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import j from "joi";
import { serializeError } from "serialize-error";

import { GroupSummary } from "../models/GroupSummary";
import { getContact } from "../queries/getContact";
import { getGroupImage } from "../queries/getGroupImage";
import { getGroupLeaders } from "../queries/getGroupLeaders";
import { getLeaderGroups } from "../queries/getLeaderGroups";

interface Args {
    contactId: number;
}

const argsSchema = j.object({
    contactId: j.number().integer().positive().required(),
});

export default class GetLeaderGroups extends HiveWorkerBase implements IGraphEndpointWorker {
    execute = async (rawArgs: unknown, context: GraphContext): Promise<GroupSummary[] | Error> => {
        try {
            const { args, knex, customGraph } = await getExecuteContext<Args>({
                worker: this,
                context,
                rawArgs,
                argsSchema,
            });

            const { participantId } = await getContact(customGraph, { ...args });

            if (!participantId) {
                throw new Error("Contact participantId could not be found.");
            }

            const groups = await getLeaderGroups(knex, { participantId });

            DanyService.getSingleton().setMetaData(this.metadata);

            const mappedGroups = await Promise.all(
                groups.map<Promise<GroupSummary>>(async (group) => {
                    return {
                        ...group,
                        leaders: await getGroupLeaders(knex, { groupId: group.groupId }),
                        url: await getGroupImage({ groupId: group.groupId }),
                    };
                })
            );

            return mappedGroups;
        } catch (err) {
            if (err instanceof Error) {
                console.log(JSON.stringify(serializeError(err)));
                return err;
            } else {
                console.log("An unknown error occurred.");
                return new Error("An unknown error occurred.");
            }
        }
    };
}
