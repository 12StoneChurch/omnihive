import { errorHelper } from "@12stonechurch/omnihive-worker-common/helpers/ErrorHelper";
import { getExecuteContext } from "@12stonechurch/omnihive-worker-common/helpers/ExecuteHelper";
import { paginateItems } from "@12stonechurch/omnihive-worker-common/helpers/PaginateHelper";
import { PageModel } from "@12stonechurch/omnihive-worker-common/models/PageModel";
import { DanyService } from "@12stonechurch/omnihive-worker-common/services/DanyService";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import j from "joi";

import { GroupSummary } from "../models/Group";
import { countLeaderGroups } from "../queries/countLeaderGroups";
import { getContact } from "../queries/getContact";
import { getGroupImage } from "../queries/getGroupImage";
import { getGroupLeaders } from "../queries/getGroupLeaders";
import { getLeaderGroups } from "../queries/getLeaderGroups";

interface Args {
    contactId: number;
    page: number;
    perPage: number;
}

const argsSchema = j.object({
    contactId: j.number().integer().positive().required(),
    page: j.number().integer().min(1).default(1),
    perPage: j.number().integer().min(1).default(20),
});

export default class GetLeaderGroups extends HiveWorkerBase implements IGraphEndpointWorker {
    execute = async (rawArgs: unknown, context: GraphContext): Promise<PageModel<GroupSummary> | Error> => {
        try {
            const { args, knex, customGraph } = await getExecuteContext<Args>({
                worker: this,
                context,
                rawArgs,
                argsSchema,
            });

            const { groups, groupsCount } = await knex.transaction(async (trx) => {
                const { participantId } = await getContact(customGraph, { ...args });

                if (!participantId) {
                    throw new Error("Contact participantId could not be found.");
                }

                const groups = await getLeaderGroups(trx, { participantId, ...args });
                const groupsCount = await countLeaderGroups(trx, { participantId });

                DanyService.getSingleton().setMetaData(this.metadata);

                const mappedGroups = await Promise.all(
                    groups.map<Promise<GroupSummary>>(async (group) => {
                        return {
                            ...group,
                            imgUrl: await getGroupImage({ groupId: group.groupId }),
                            leaders: await getGroupLeaders(trx, { groupId: group.groupId }),
                        };
                    })
                );

                return { groups: mappedGroups, groupsCount };
            });

            return paginateItems<GroupSummary>(groups, groupsCount, args.page, args.perPage);
        } catch (err) {
            return errorHelper(err);
        }
    };
}
