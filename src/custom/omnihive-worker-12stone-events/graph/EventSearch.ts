import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import ElasticWorker, { ElasticSearchFieldModel } from "@12stonechurch/omnihive-worker-elastic";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { Search } from "../common/Search";
import dayjs from "dayjs";
import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { GetEventById } from "../common/GetEventById";
import { Event } from "../lib/models/Event";

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
    public execute = async (customArgs: any): Promise<Event[]> => {
        try {
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

            GraphService.getSingleton().graphRootUrl =
                this.serverSettings.config.webRootUrl + "/server1/builder1/ministryplatform";

            let events: Event[] = [];
            let searchResults: any;

            if (searchFields.length <= 0) {
                throw new Error("No search fields to search given.");
            }

            if (query) {
                const elasticWorker: ElasticWorker | undefined = this.getWorker(HiveWorkerType.Unknown, "ohElastic") as
                    | ElasticWorker
                    | undefined;

                if (!elasticWorker) {
                    throw new Error("Elastic Worker is not defined.");
                }

                searchResults = await AwaitHelper.execute(Search(elasticWorker, query, searchFields, page, limit));

                const idsFound: number[] = searchResults.data.map((item: any) => item.EventId);
                events = await GetEventById(idsFound, participantId);

                if (campusIds.length > 0) {
                    events = events.filter((e: Event) =>
                        campusIds.some((campus: number) => campus === e.congregation.id)
                    );
                }

                if (ageRangeIds.length > 0) {
                    events = events.filter((e: Event) => ageRangeIds.some((age: number) => age === e.ageRange.id));
                }

                if (tagIds.length > 0) {
                    events = events.filter((e: Event) =>
                        tagIds.some((tag: number) => e.eventTags.some((et: any) => et.id === tag))
                    );
                }
            } else {
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

                searchResults = (await AwaitHelper.execute(GraphService.getSingleton().runQuery(storedProc)))
                    .storedProcedures[0].data[0];
                const idsFound: number[] = searchResults.map((item: any) => item.eventId);
                events = await GetEventById(idsFound, participantId);
            }

            if (childcareAvailable !== undefined) {
                events = events.filter((e: Event) => e.childcareAvailable === childcareAvailable);
            }

            return events;
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
