import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";

import { getEventById } from "../common/queries/getEventById";
import { EventType } from "../types/Event";

/**
 * Args:
 *   id: string
 */

export default class GetEventById extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any): Promise<EventType> => {
        const graph = GraphService.getSingleton();
        graph.init(this.registeredWorkers); // init encryption worker (required for custom SQL)
        graph.graphRootUrl = this.serverSettings.config.webRootUrl + this.config.metadata.dataSlug;

        try {
            const eventId: number = Number(customArgs.id);
            return await getEventById(eventId);
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
