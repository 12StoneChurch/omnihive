import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import ElasticWorker, { ElasticSearchFieldModel } from "@12stonechurch/omnihive-worker-elastic";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { Search } from "../common/Search";
import dayjs from "dayjs";
import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { GetEventsByIdList } from "../common/GetEventsByIdList";
import { Event } from "../lib/models/Event";
import { PaginationModel } from "@12stonechurch/omnihive-worker-common/models/PaginationModel";
import { IsHelper } from "@withonevision/omnihive-core/helpers/IsHelper";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";

/**
 * Args:
 *  query?: string
 *  dateRangeStart?: Date
 *  dateRangeEnd?: Date
 *  campusIds?: number[]
 *  ageRangeIds?: number[]
 *  tagIds?: number[]
 *  participantId?: number
 *  childcareAvailable: boolean
 *  page?: number
 *  limit?: number
 */

export default class EventSearch extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any, _omniHiveContext: GraphContext): Promise<PaginationModel<Event>> => {
        try {
            const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

            if (IsHelper.isNullOrUndefined(webRootUrl)) {
                throw new Error("Web Root URL undefined");
            }

            if (!customArgs) {
                customArgs = {};
            }

            const query: string = customArgs.query;
            const searchFields: ElasticSearchFieldModel[] = this.buildSearchFields();
            const page = customArgs?.page ?? 1;
            const limit = customArgs.limit ?? 100;
            const dateStart = customArgs.dateRangeStart ? dayjs(customArgs.dateRangeStart) : dayjs().startOf("day");
            const dateEnd = customArgs.dateRangeEnd ? dayjs(customArgs.dateRangeEnd) : undefined;
            const campusIds = customArgs.campusIds ?? [];
            const ageRangeIds = customArgs.ageRangeIds ?? [];
            const tagIds = customArgs.tagIds ?? [];
            const participantId = customArgs.participantId ?? 0;
            const childcareAvailable = customArgs.childcareAvailable;

            let events: Event[] = [];
            let searchResults: any = [];

            if (searchFields.length <= 0) {
                throw new Error("No search fields to search given.");
            }

            GraphService.getSingleton().graphRootUrl = webRootUrl + "/server1/builder1/ministryplatform";

            // Get all events on filter conditions
            const storedProc = `
                query {
                    storedProcedures {
                      data: api_12Stone_Custom_Events_ListEvents (
                          DomainId: "1"
                          , Cancelled: false
                          , EventStatusId: 3
                          , VisibilityLevelId: 4
                          ${dateStart ? `, DateRangeStart: "${dateStart.format("YYYY-MM-DD HH:mm:ss")}"` : ""}
                          ${dateEnd ? `, DateRangeEnd: "${dateEnd.format("YYYY-MM-DD HH:mm:ss")}"` : ""}
                          ${campusIds.length > 0 ? `, CongregationIds: "${campusIds.join("|")}"` : ""}
                          ${ageRangeIds.length > 0 ? `, AgeRangeIds: "${ageRangeIds.join("|")}"` : ""}
                          ${tagIds.length > 0 ? `, TagIds: "${tagIds.join("|")}"` : ""}
                        )
                    }
                }
            `;

            let eventList = (await AwaitHelper.execute(GraphService.getSingleton().runQuery(storedProc)))
                .storedProcedures[0].data[0];

            if (query) {
                const elasticWorker: ElasticWorker | undefined = this.getWorker(HiveWorkerType.Unknown, "ohElastic") as
                    | ElasticWorker
                    | undefined;

                if (!elasticWorker) {
                    throw new Error("Elastic Worker is not defined.");
                }

                const databaseRowLimit = (await this.getWorker(HiveWorkerType.Database, "dbMinistryPlatform"))?.metadata
                    .rowLimit;

                searchResults = await AwaitHelper.execute(
                    Search(elasticWorker, query, searchFields, 1, databaseRowLimit)
                );

                eventList = eventList.filter((x: Event) =>
                    searchResults.data.some((y: any) => x.eventId === y.EventId)
                );
            }

            if (eventList.length <= 0) {
                return {
                    nextPageNumber: undefined,
                    previousPageNumber: undefined,
                    totalCount: 0,
                    data: [],
                };
            }

            events = await GetEventsByIdList(
                eventList.map((e: Event) => e.eventId),
                participantId
            );

            if (childcareAvailable !== undefined) {
                events = events.filter((e: Event) => e.childcareAvailable === childcareAvailable);
            }

            if (searchResults?.data?.length > 0) {
                events.forEach(
                    (e: Event) => (e.score = searchResults.data.find((d: any) => d.EventId === e.eventId)?.score)
                );

                events.sort((a: Event, b: Event) => (b.score ?? 0) - (a.score ?? 0));
            }

            const offset = (page - 1) * limit;

            const results: PaginationModel<Event> = {
                previousPageNumber: page > 1 ? page - 1 : undefined,
                nextPageNumber: page * limit < events.length ? page + 1 : undefined,
                totalCount: events.length,
                data: events.slice(offset, offset + limit),
            };

            return results;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };

    private buildSearchFields = (): ElasticSearchFieldModel[] => {
        return [
            {
                name: "EventName",
                weight: 0.5,
            },
            {
                name: "EventTags",
                weight: 0.4,
            },
            {
                name: "Description",
                weight: 0.1,
            },
            {
                name: "Congregation",
                weight: 0.3,
            },
            {
                name: "AddressLine1",
                weight: 0.2,
            },
            {
                name: "City",
                weight: 0.3,
            },
            {
                name: "State",
                weight: 0.3,
            },
            {
                name: "PostalCode",
                weight: 0.4,
            },
            {
                name: "LeaderNames",
                weight: 0.3,
            },
            {
                name: "AgeRange",
                weight: 0.2,
            },
            {
                name: "SkillsNeeded",
                weight: 0.2,
            },
        ];
    };
}
