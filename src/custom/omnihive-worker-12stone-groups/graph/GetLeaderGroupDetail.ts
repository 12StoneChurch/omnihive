import { errorHelper } from "@12stonechurch/omnihive-worker-common/helpers/ErrorHelper";
import { getExecuteContext } from "@12stonechurch/omnihive-worker-common/helpers/ExecuteHelper";
import { DanyService } from "@12stonechurch/omnihive-worker-common/services/DanyService";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import j from "joi";

import { GroupDetail } from "../models/Group";
import { getGroupImage } from "../queries/getGroupImage";
import { getGroupLeaders } from "../queries/getGroupLeaders";
import { getLeaderGroupDetail } from "../queries/getLeaderGroupDetail";

interface Args {
    groupId: number;
}

const argsSchema = j.object({
    groupId: j.number().integer().positive().required(),
});

export default class GetLeaderGroupDetail extends HiveWorkerBase implements IGraphEndpointWorker {
    execute = async (rawArgs: unknown, context: GraphContext): Promise<GroupDetail | Error> => {
        try {
            const { args, knex } = await getExecuteContext<Args>({
                worker: this,
                context,
                rawArgs,
                argsSchema,
            });

            return await knex.transaction(async (trx) => {
                const baseGroup = await getLeaderGroupDetail(trx, { ...args });

                DanyService.getSingleton().setMetaData(this.metadata);

                return {
                    ...baseGroup,
                    imgUrl: await getGroupImage({ ...args }),
                    leaders: await getGroupLeaders(trx, { ...args }),
                };
            });
        } catch (err) {
            return errorHelper(err);
        }
    };
}
