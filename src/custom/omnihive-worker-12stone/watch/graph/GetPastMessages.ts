import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import dayjs from "dayjs";
import { PaginationModel } from "../../lib/models/PaginationModel";
import { WatchContent } from "../../lib/models/WatchModels";
import { GraphService } from "../../lib/services/GraphService";
import { transformDataToWatchContent } from "../common/DataToWatchContent";

export default class getPastMessages extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any | undefined): Promise<PaginationModel<WatchContent>> => {
        const page: number = customArgs?.page ?? 1;
        const limit: number = customArgs?.limit ?? 100;

        const query = `
          query {
              proc: storedProcedures { 
                  document: api_12Stone_Custom_Cms_GetDynamicDocumentsByTypeId(DocumentTypeId: 2, SiteId: 1, Page: ${
                      page - 1
                  }, Limit: ${limit})
              }
          }
      `;

        GraphService.getSingleton().graphRootUrl =
            this.serverSettings.config.webRootUrl + "/server1/builder1/ministryplatform";

        const results: any = await AwaitHelper.execute(GraphService.getSingleton().runQuery(query));

        const documentData: any = results.proc[0].document[0];

        const documents: WatchContent[] = documentData
            .map((doc: any) => {
                return transformDataToWatchContent(doc);
            })
            .filter((x: WatchContent | undefined) => x);

        const totalCount = results.proc[0].document[1][0]["Total Count"];
        const endingIndex = page * limit;

        return {
            nextPageNumber: totalCount > endingIndex ? page + 1 : undefined,
            previousPageNumber: page > 1 ? page - 1 : undefined,
            totalCount: totalCount,
            data: documents.sort((a, b) => {
                return dayjs(b.date).unix() - dayjs(a.date).unix();
            }),
        };
    };
}
