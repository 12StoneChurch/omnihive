import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import ElasticWorker, { ElasticSearchFieldModel } from "@12stonechurch/omnihive-worker-elastic";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { Search } from "../common/Search";

/**
 * Args:
 *  query: string
 *  typeIds: number[]
 *  page: number
 *  limit: number
 */
export default class EventSearch extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any): Promise<any> => {
        try {
            const query: string = customArgs.query;
            const searchFields: ElasticSearchFieldModel[] = this.buildSearchFields();
            const page = customArgs?.page ?? 1;
            const limit = customArgs.limit ?? 100;

            if (!query || query.length < 3) {
                throw new Error("The query specified is not of sufficent length.");
            }

            if (searchFields.length <= 0) {
                throw new Error("No search fields to search given.");
            }

            const elasticWorker: ElasticWorker | undefined = this.getWorker(HiveWorkerType.Unknown, "ohElastic") as
                | ElasticWorker
                | undefined;

            if (!elasticWorker) {
                throw new Error("Elastic Worker is not defined.");
            }

            const searchResults: any = await AwaitHelper.execute(
                Search(elasticWorker, query, searchFields, page, limit)
            );

            return searchResults;
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
