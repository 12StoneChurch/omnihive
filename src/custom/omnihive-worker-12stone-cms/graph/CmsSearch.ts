import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import ElasticWorker, { ElasticSearchFieldModel } from "@12stonechurch/omnihive-worker-elastic";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { Search } from "../common/Search";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";

/**
 * Args:
 *  query: string
 *  typeIds: number[]
 *  searchFields: {
 *      name: string,
 *      weight: number,
 *  }
 *  siteId: number
 *  page: number
 *  limit: number
 */
export default class CmsSearch extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any, _omniHiveContext: GraphContext): Promise<any> => {
        try {
            const query: string = customArgs.query;
            const typeIds: number[] = customArgs.typeIds ?? [];
            const searchFields: ElasticSearchFieldModel[] = customArgs.searchFields ?? [];
            const siteId: number = customArgs.siteId ?? 1;
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
                Search(elasticWorker, query, searchFields, siteId, typeIds, page, limit)
            );

            return searchResults;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
