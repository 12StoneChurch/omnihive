import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";
import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { IsHelper } from "@withonevision/omnihive-core/helpers/IsHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
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
    registered: Joi.boolean().default(false),
}).required();

interface Args {
    page: number;
    perPage: number;
    visibility: number;
    userId?: number;
    registered?: boolean;
}

export interface ListEventsResult {
    data: {
        ListEvents: PageType<EventType> | null;
    };
}

export default class ListEvents extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<PageType<EventType>> => {
        try {
            /* Verify auth token */
            await verifyToken(_omniHiveContext);

            const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

            if (IsHelper.isNullOrUndefined(webRootUrl)) {
                throw new Error("Web Root URL undefined");
            }

            const graph = GraphService.getSingleton();
            await graph.init(this.registeredWorkers, this.environmentVariables);
            graph.graphRootUrl = webRootUrl + this.metadata.dataSlug;

            const { error, value } = argsSchema.validate(customArgs || {});
            if (error) throw new Error(`Validation error: ${error.message}`);

            const { page, perPage, visibility, userId, registered } = value as Args;

            if (registered && !userId) throw new Error(`Parameter "registered" requires the "userId" parameter.`);

            return await listEvents(page, perPage, visibility, userId, registered);
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
    userId?: number,
    registered?: boolean
): Promise<PageType<EventType>> {
    return await Promise.all([
        queryEventsCount(visibility, userId, registered),
        new Promise<EventType[]>(async (resolve, reject) => {
            try {
                const events = await queryEventsList(page, perPage, visibility, userId, registered);
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
