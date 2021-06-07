import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";

import { listEvents } from "../common/queries/listEvents";
import type { Page } from "../types/Page";

/**
 * Args:
 *   page: number
 *   perPage: number
 */

export default class ListEvents extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any): Promise<Page<any>> => {
        const graph = GraphService.getSingleton();
        graph.init(this.registeredWorkers); // init encryption worker (required for custom SQL)
        graph.graphRootUrl = this.serverSettings.config.webRootUrl + this.config.metadata.dataSlug;

        try {
            const page = Number(customArgs.page) ?? 1;
            const perPage = Number(customArgs.perPage) ?? 20;
            return await listEvents(page, perPage);
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
