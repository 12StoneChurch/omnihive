import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import Joi from "joi";
import { serializeError } from "serialize-error";

import { queryUserProfile } from "../common/queries/queryUserProfile";
import type { UserType } from "../types/User";

// import { mapEvent } from "../common/helpers/mapEvent";
// import { queryEvent } from "../common/queries/queryEvent";
// import { queryEventTags } from "../common/queries/queryEventTags";
// import type { EventType } from "../types/Event";

const argsSchema = Joi.object({
    id: Joi.number().min(1).required(),
}).required();

interface Args {
    id: number;
}

export interface GetUserProfileResult {
    data: {
        GetUserProfile: UserType | null;
    };
}

export default class GetUserProfile extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args): Promise<UserType> => {
        const graph = GraphService.getSingleton();
        graph.init(this.registeredWorkers);
        graph.graphRootUrl = this.serverSettings.config.webRootUrl + this.config.metadata.dataSlug;

        try {
            const { error, value } = argsSchema.validate(customArgs);
            if (error) throw new Error(`Validation error: ${error.message}`);

            const { id } = value as Args;
            return await getUserProfile(id);
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

export async function getUserProfile(id: number): Promise<UserType> {
    const [user] = await queryUserProfile(id);
    return user;
}
