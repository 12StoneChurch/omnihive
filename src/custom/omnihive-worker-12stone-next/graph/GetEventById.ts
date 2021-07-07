import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import Joi from "joi";
import { serializeError } from "serialize-error";
import { IsHelper } from "@withonevision/omnihive-core/helpers/IsHelper";

import { mapEvent } from "../common/helpers/mapEvent";
import { queryEvent } from "../common/queries/queryEvent";
import { queryEventTags } from "../common/queries/queryEventTags";
import type { EventType } from "../types/Event";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";

const argsSchema = Joi.object({
    eventId: Joi.number().min(1).required(),
    userId: Joi.number().min(1).optional(),
}).required();

interface Args {
    eventId: number;
    userId?: number;
}

export interface GetEventByIdResult {
    data: {
        GetEventById: EventType | null;
    };
}

export default class GetEventById extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<EventType> => {
        const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

        if (IsHelper.isNullOrUndefined(webRootUrl)) {
            throw new Error("Web Root URL undefined");
        }

        const graph = GraphService.getSingleton();
        graph.init(this.registeredWorkers, this.environmentVariables);
        graph.graphRootUrl = webRootUrl + this.metadata.dataSlug;

        try {
            const { error, value } = argsSchema.validate(customArgs || {});
            if (error) throw new Error(`Validation error: ${error.message}`);

            const { eventId, userId } = value as Args;
            return await getEventById(eventId, userId);
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

export async function getEventById(eventId: number, userId?: number) {
    return await Promise.all([queryEventTags(eventId), queryEvent(eventId, userId)]).then(([tags, events]) => {
        const [event]: EventType[] = mapEvent(tags, events);
        return event;
    });
}
