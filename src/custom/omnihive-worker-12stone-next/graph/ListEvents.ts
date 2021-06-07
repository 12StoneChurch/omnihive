import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import Joi from "joi";
import { serializeError } from "serialize-error";

import { listEvents } from "../common/queries/listEvents";
import type { Page } from "../types/Page";

const argsSchema = Joi.object({
    page: Joi.number().min(1).default(1),
    perPage: Joi.number().min(1).default(20),
}).required();

interface Args {
    page: number;
    perPage: number;
}

/**
 * Args:
 *   page?: number = 1
 *   perPage?: number = 20
 */

export default class ListEvents extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args = { page: 1, perPage: 20 }): Promise<Page<any>> => {
        const graph = GraphService.getSingleton();
        graph.init(this.registeredWorkers); // init encryption worker (required for custom SQL)
        graph.graphRootUrl = this.serverSettings.config.webRootUrl + this.config.metadata.dataSlug;

        try {
            const { error, value } = argsSchema.validate(customArgs);
            console.log({ error, value });
            if (error) throw new Error(`Validation error: ${error.message}`);

            const { page, perPage } = value;
            return await listEvents(page, perPage);
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
