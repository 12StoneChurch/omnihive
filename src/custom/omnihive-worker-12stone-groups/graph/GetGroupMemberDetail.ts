import { errorHelper } from "@12stonechurch/omnihive-worker-common/helpers/ErrorHelper";
import { getExecuteContext } from "@12stonechurch/omnihive-worker-common/helpers/ExecuteHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import j from "joi";

import { GroupMemberDetail } from "../models/GroupMember";
import { getGroupParticipantDetail } from "../queries/getGroupParticipantDetail";

interface Args {
    groupId: number;
    contactId: number;
}

const argsSchema = j.object({
    groupId: j.number().integer().positive().required(),
    contactId: j.number().integer().positive().required(),
});

export default class GetGroupMemberDetail extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (rawArgs: unknown, context: GraphContext): Promise<GroupMemberDetail | Error> => {
        try {
            const { args, knex, customGraph } = await getExecuteContext<Args>({
                worker: this,
                context,
                rawArgs,
                argsSchema,
            });

            return await knex.transaction(async (trx) => {
                const { photoGuid, ...participantRest } = await getGroupParticipantDetail(trx, { ...args });

                let photoUrl: string | undefined = undefined;

                if (photoGuid) {
                    const {
                        GetCdnUrl: { url },
                    } = await customGraph.runQuery(`query{GetCdnUrl(customArgs:{UniqueName:"${photoGuid}"})}`);

                    photoUrl = url;
                }

                return {
                    ...participantRest,
                    photoUrl,
                    family: await Promise.all(
                        participantRest.family.map(async (member) => {
                            const { photoGuid, ...memberRest } = member;

                            let photoUrl: string | undefined = undefined;

                            if (photoGuid) {
                                const {
                                    GetCdnUrl: { url },
                                } = await customGraph.runQuery(
                                    `query{GetCdnUrl(customArgs:{UniqueName:"${photoGuid}"})}`
                                );

                                photoUrl = url;
                            }

                            return { ...memberRest, photoUrl };
                        })
                    ),
                };
            });
        } catch (err) {
            return errorHelper(err);
        }
    };
}
