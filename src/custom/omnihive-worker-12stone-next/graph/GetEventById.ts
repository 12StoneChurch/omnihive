import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import Joi from "joi";
import { serializeError } from "serialize-error";

import { mapEvent } from "../common/helpers/mapEvent";
import { queryEvent } from "../common/queries/queryEvent";
import { queryEventTags } from "../common/queries/queryEventTags";
import type { EventType } from "../types/Event";

const argsSchema = Joi.object({
    id: Joi.number().min(1).required(),
}).required();

interface Args {
    id: number;
}

export interface GetEventByIdResult {
    data: {
        GetEventById: EventType | null;
    };
}

export default class GetEventById extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args): Promise<EventType> => {
        const graph = GraphService.getSingleton();
        graph.init(this.registeredWorkers);
        graph.graphRootUrl = this.serverSettings.config.webRootUrl + this.config.metadata.dataSlug;

        try {
            const { error, value } = argsSchema.validate(customArgs);
            if (error) throw new Error(`Validation error: ${error.message}`);

            const { id } = value as Args;
            return await getEventById(id);
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

export async function getEventById(id: number) {
    return await Promise.all([queryEventTags(id), queryEvent(id)]).then(([tags, events]) => {
        const [event]: EventType[] = mapEvent(tags, events);
        return event;
    });
}
