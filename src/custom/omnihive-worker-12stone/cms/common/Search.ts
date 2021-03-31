import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { serializeError } from "serialize-error";
import ElasticWorker, { ElasticSearchFieldModel } from "@12stonechurch/omnihive-worker-elastic";
import { PaginationModel } from "../../lib/models/PaginationModel";

export const Search = async (
    elasticWorker: ElasticWorker,
    query: string,
    searchFields: ElasticSearchFieldModel[] = [],
    siteId: number = 1,
    typeIds: number[] = [],
    page: number = 1,
    limit: number = 100
): Promise<any> => {
    try {
        if (!elasticWorker) {
            throw new Error("Elastic Worker is not defined.");
        }

        if (!query || query.length < 3) {
            throw new Error("The query specified is not of sufficent length.");
        }

        if (searchFields.length <= 0) {
            throw new Error("No search fields to search given.");
        }

        const searchResults: PaginationModel<any> = {
            nextPageNumber: undefined,
            previousPageNumber: page === 1 ? undefined : page - 1,
            totalCount: 0,
            data: [],
        };

        const results = await AwaitHelper.execute(
            elasticWorker.search(`cms-${siteId}`, query, searchFields, page - 1, limit)
        );

        const formattedResults: any[] = [];
        results.hits.hits.forEach((hit: any) => {
            if (!typeIds || typeIds.length <= 0 || typeIds.some((x) => x === hit._source.DocumentTypeId)) {
                formattedResults.push({
                    ...hit._source,
                    score: hit._score,
                });
            }
        });

        searchResults.data = formattedResults;
        searchResults.totalCount = results.hits.total.value;
        searchResults.nextPageNumber = searchResults.totalCount > page * limit ? page + 1 : undefined;

        return searchResults;
    } catch (err) {
        console.log(JSON.stringify(serializeError(err)));
        return err;
    }
};
