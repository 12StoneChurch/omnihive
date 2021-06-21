import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import Joi from "joi";
import { serializeError } from "serialize-error";

import { mapEventsList } from "../common/helpers/mapEventsList";
import { paginatedItemsResult } from "../common/helpers/paginatedItemsResult";
import { queryEventsCount } from "../common/queries/queryEventsCount";
import { queryEventsList } from "../common/queries/queryEventsList";
import type { EventType } from "../types/Event";
import type { PageType } from "../types/Page";

const argsSchema = Joi.object({
    page: Joi.number().min(1).default(1),
    perPage: Joi.number().min(1).default(20),
    visibility: Joi.number().allow(1, 2, 3, 4, 5).default(4),
    userId: Joi.number().optional(),
}).required();

interface Args {
    page: number;
    perPage: number;
    visibility: number;
    userId?: number;
}

export interface ListEventsResult {
    data: {
        ListEvents: PageType<EventType> | null;
    };
}

export default class ListEvents extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args): Promise<PageType<EventType>> => {
        const graph = GraphService.getSingleton();
        graph.init(this.registeredWorkers);
        graph.graphRootUrl = this.serverSettings.config.webRootUrl + this.config.metadata.dataSlug;

        try {
            const { error, value } = argsSchema.validate(customArgs || {});
            if (error) throw new Error(`Validation error: ${error.message}`);

            const { page, perPage, visibility, userId } = value as Args;
            return await listEvents(page, perPage, visibility, userId);
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

export async function listEvents(
    page: number,
    perPage: number,
    visibility: number,
    userId?: number
): Promise<PageType<EventType>> {
    return await Promise.all([
        queryEventsCount(visibility),
        new Promise<EventType[]>(async (resolve, reject) => {
            try {
                const events = await queryEventsList(page, perPage, visibility, userId);
                const mappedEvents = await mapEventsList(events);
                resolve(mappedEvents);
            } catch (err) {
                reject(err);
            }
        }),
    ])
        .then(([total, items]) => {
            return paginatedItemsResult(items, page, total, perPage);
        })
        .catch((err) => {
            throw err;
        });
}
