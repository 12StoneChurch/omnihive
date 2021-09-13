import { errorHelper } from "@12stonechurch/omnihive-worker-common/helpers/ErrorHelper";
import { getExecuteContext } from "@12stonechurch/omnihive-worker-common/helpers/ExecuteHelper";
import { paginateItems } from "@12stonechurch/omnihive-worker-common/helpers/PaginateHelper";
import { PageModel } from "@12stonechurch/omnihive-worker-common/models/PageModel";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import j from "joi";

import { GroupMemberSummary } from "../models/GroupMember";
import { countGroupParticipants } from "../queries/countGroupMembers";
import { getGroupParticipants } from "../queries/getGroupMembers";

interface Args {
    groupId: number;
    page: number;
    perPage: number;
}

const argsSchema = j.object({
    groupId: j.number().integer().positive().required(),
    page: j.number().integer().positive().default(1),
    perPage: j.number().integer().positive().default(20),
});

export default class GetGroupMembers extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (
        rawArgs: unknown,
        context: GraphContext
    ): Promise<PageModel<GroupMemberSummary> | Error> => {
        try {
            const { args, knex, customGraph } = await getExecuteContext<Args>({
                worker: this,
                context,
                rawArgs,
                argsSchema,
            });

            const { members, membersCount } = await knex.transaction(async (trx) => {
                const participants = await getGroupParticipants(trx, { ...args });

                const members = await Promise.all(
                    participants.map(async (participant) => {
                        console.log({ participant });

                        const { photoGuid, ...participantRest } = participant;

                        let photoUrl: string | undefined = undefined;

                        if (photoGuid) {
                            const {
                                GetCdnUrl: { url },
                            } = await customGraph.runQuery(
                                `query{GetCdnUrl(customArgs:{UniqueName:"${participant.photoGuid}"})}`
                            );

                            photoUrl = url;
                        }

                        console.log({ photoUrl });

                        return { ...participantRest, photoUrl };
                    })
                );

                const membersCount = await countGroupParticipants(trx, { ...args });

                return { members, membersCount };
            });

            return paginateItems<GroupMemberSummary>(members, membersCount, args.page, args.perPage);
        } catch (err) {
            return errorHelper(err);
        }
    };
}
