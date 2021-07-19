import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { Knex } from "knex";
import { serializeError } from "serialize-error";

import { HiveWorkerType } from "../../../packages/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "../../../packages/omnihive-core/interfaces/IDatabaseWorker";
import { EngagementModel } from "../lib/models/Engagement";
import { countQueryBuilder } from "../queries/countQueryBuilder";
import { engagementsQueryBuilder } from "../queries/engagementsQueryBuilder";

interface Args {
    page?: number;
    perPage?: number;
    contactId?: number;
    ownerId?: number;
    statusId?: number;
    congregationId?: number;
    typeId?: number;
}

export default class GetEngagements extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<{}> => {
        try {
            // Get the connection to the database
            const worker = await this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");

            // Set connection as Knex
            const connection = worker?.connection as Knex;

            // PAGE ARGS
            let page = customArgs?.page && customArgs.page >= 1 ? customArgs.page : 1;
            const perPage = customArgs?.perPage && customArgs.perPage >= 1 ? customArgs.perPage : 20;

            // Update customArgs so that queries have useable arguments (in the case the user put in something like page = -1)
            if (customArgs?.page) {
                customArgs.page = page;
            }
            if (customArgs?.perPage) {
                customArgs.perPage = perPage;
            }

            // GET TOTAL ENGAGEMENTS COUNT
            const countQuery = countQueryBuilder(connection, customArgs);
            const countRes = await worker?.executeQuery(countQuery.toString());

            let count = countRes ? countRes[0][0].count : 0;
            const totalPages = Math.ceil(count / perPage);

            // In case the user is trying to get a higher page than is possible,
            // it should return data for the highest posssible page (as opposed to returning nothing)
            if (totalPages < page) {
                page = totalPages;
                customArgs.page = page;
            }

            // GET ENGAGEMENT QUERY
            const engagementQuery = engagementsQueryBuilder(connection, customArgs);
            const res = await worker?.executeQuery(engagementQuery.toString());
            const engagementRes = res ?? [];

            // Clean up engagement data
            const engagements: EngagementModel[] = engagementRes[0].map((item: any) => ({
                engagementId: item.Engagement_ID,
                description: item.description,
                dateCreated: item.Date_Created,
                contact: {
                    contactId: item.Contact_ID,
                    firstName: item.Contact_First_Name,
                    lastName: item.Contact_Last_Name,
                },
                owner: {
                    contactId: item.Owner_Contact_ID,
                    firstName: item.Owner_First_Name,
                    lastName: item.Owner_Last_Name,
                },
                campus: {
                    id: item.Campus_ID,
                    name: item.Campus,
                },
                type: {
                    id: item.Engagement_Type_ID,
                    name: item.Type,
                },
                status: {
                    id: item.Engagement_Status_ID,
                    name: item.Status,
                },
            }));

            // nextPage and previousPage should return correctly even if given impossible args
            // For instance, if the page arg is greater than number of possible pages, it should return the highest possible page as the previousPage
            // Or if it the page arg is a negative number, nextPage should return 2
            const nextPage = page < totalPages ? page + 1 : null;
            // Previous page should return correctly even if given
            const previousPage =
                page <= 1 || totalPages <= 1
                    ? null
                    : totalPages > 1 && page <= totalPages
                    ? page - 1
                    : page > totalPages
                    ? totalPages
                    : null;

            // Build final return object
            const returnObj = {
                page: page,
                per_page: perPage,
                total_items: count,
                total_pages: totalPages,
                next_page: nextPage,
                previous_page: previousPage,
                items: engagements,
            };

            return returnObj;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
