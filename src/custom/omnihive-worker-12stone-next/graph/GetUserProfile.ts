import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import Joi from "joi";
import { serializeError } from "serialize-error";

import { queryCdnUrl } from "../common/queries/queryCdnUrl";
import { queryPhotoGuid } from "../common/queries/queryPhotoGuid";
import { queryUserProfile } from "../common/queries/queryUserProfile";
import type { UserType } from "../types/User";

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
        const mpGraphRootUrl = this.serverSettings.config.webRootUrl + this.config.metadata.dataSlug;
        const customGraphRootUrl = this.serverSettings.config.webRootUrl + this.config.metadata.customSlug;

        try {
            const { error, value } = argsSchema.validate(customArgs);
            if (error) throw new Error(`Validation error: ${error.message}`);

            const { id } = value as Args;
            return await getUserProfile(id, mpGraphRootUrl, customGraphRootUrl);
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

export async function getUserProfile(
    id: number,
    mpGraphRootUrl: string,
    customGraphRootUrl: string
): Promise<UserType> {
    const [user] = await queryUserProfile(id, mpGraphRootUrl);
    const photoGuid = await queryPhotoGuid(user.contact_id, mpGraphRootUrl);
    const img_url = await queryCdnUrl(photoGuid, customGraphRootUrl);

    return {
        ...user,
        img_url,
    };
}