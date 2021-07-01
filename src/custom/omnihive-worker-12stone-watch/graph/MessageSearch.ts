import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import ElasticWorker, { ElasticSearchFieldModel } from "@12stonechurch/omnihive-worker-elastic";
import { PaginationModel } from "@12stonechurch/omnihive-worker-common/models/PaginationModel";
import { WatchContent } from "@12stonechurch/omnihive-worker-common/models/WatchModels";
import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { getMessageById } from "../common/GetMessaegById";
import getPastMessages from "./GetPastMessages";
import { IsHelper } from "@withonevision/omnihive-core/helpers/IsHelper";

export default class MessageSearch extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any | undefined): Promise<PaginationModel<WatchContent> | {}> => {
        try {
            const query = customArgs?.query ?? "";
            const page = customArgs?.page ?? 1;
            const limit = customArgs.limit ?? 100;

            if (!query) {
                const pastMessageFunction = new getPastMessages();
                const args = {
                    page: page,
                    limit: limit,
                };

                return AwaitHelper.execute<PaginationModel<WatchContent>>(pastMessageFunction.execute(args));
            }

            const elasticWorker: ElasticWorker | undefined = this.getWorker(HiveWorkerType.Unknown, "ohElastic") as
                | ElasticWorker
                | undefined;

            if (elasticWorker) {
                const searchFields: ElasticSearchFieldModel[] = this.buildSearchFields();

                const results = await AwaitHelper.execute(elasticWorker.search("cms-1", query, searchFields, 0, 10000));

                const parsedData: { doc: WatchContent; score: number }[] = await Promise.all(
                    results.hits.hits.map(async (x: any) => await this.buildFinalData(x))
                );

                const finalData: WatchContent[] = parsedData
                    .filter((x) => x)
                    .sort((a, b) => b.score - a.score)
                    .map((x) => x.doc);

                const totalCount: number = finalData.length;
                const startingIndex: number = (page - 1) * limit;
                const endingIndex: number = page * limit;

                const final: PaginationModel<WatchContent> = {
                    nextPageNumber: totalCount > endingIndex ? page + 1 : undefined,
                    previousPageNumber: page > 1 ? page - 1 : undefined,
                    totalCount: totalCount,
                    data: finalData.slice(startingIndex, endingIndex),
                };

                return final;
            } else {
                throw new Error("Elastic Worker not defined");
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };

    private buildSearchFields(): ElasticSearchFieldModel[] {
        const searchFields: ElasticSearchFieldModel[] = [];

        searchFields.push({
            name: "Title",
            weight: 0.5,
        });

        searchFields.push({
            name: "Excerpt",
            weight: 0.25,
        });

        searchFields.push({
            name: "Tweetable Quote - Text|Tweetable Quotes|1",
            weight: 0.1,
        });
        searchFields.push({
            name: "Tweetable Quote - Text|Tweetable Quotes|2",
            weight: 0.1,
        });
        searchFields.push({
            name: "Tweetable Quote - Text|Tweetable Quotes|3",
            weight: 0.1,
        });
        searchFields.push({
            name: "Tweetable Quote - Text|Tweetable Quotes|4",
            weight: 0.1,
        });
        searchFields.push({
            name: "Tweetable Quote - Text|Tweetable Quotes|5",
            weight: 0.1,
        });
        searchFields.push({
            name: "Tweetable Quote - Text|Tweetable Quotes|6",
            weight: 0.1,
        });
        searchFields.push({
            name: "Tweetable Quote - Text|Tweetable Quotes|7",
            weight: 0.1,
        });

        searchFields.push({
            name: "Speaker",
            weight: 0.1,
        });

        // searchFields.push({
        //     name: "PublishDate",
        //     weight: 0.045,
        // });

        searchFields.push({
            name: "Content",
            weight: 0.005,
        });

        return searchFields;
    }

    private async buildFinalData(doc: any): Promise<{ doc: WatchContent; score: number } | undefined> {
        const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

        if (IsHelper.isNullOrUndefined(webRootUrl)) {
            throw new Error("Web Root URL undefined");
        }

        if (doc._source.DocumentTypeId === 2) {
            GraphService.getSingleton().graphRootUrl = webRootUrl + "/server1/builder1/ministryplatform";

            const document = await AwaitHelper.execute<WatchContent | undefined>(
                getMessageById(doc._source.SiteDocumentId)
            );

            if (document) {
                return { doc: document, score: doc._score };
            }
        }

        return undefined;
    }
}
