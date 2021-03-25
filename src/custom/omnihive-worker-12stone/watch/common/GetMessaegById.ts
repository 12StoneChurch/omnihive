import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { WatchContent } from "../../lib/models/WatchModels";
import { GraphService } from "../../lib/services/GraphService";
import { transformDataToWatchContent } from "./DataToWatchContent";

export const getMessageById = async (siteDocumentId: number = 0): Promise<WatchContent | undefined> => {
    if (siteDocumentId) {
        const messageQuery = `
            query {
                proc: storedProcedures {
                    document: api_12Stone_Custom_Cms_GetDynamicDocumentById (SiteDocumentId: ${siteDocumentId})
                }
            }
        `;

        const results: any = await AwaitHelper.execute(GraphService.getSingleton().runQuery(messageQuery));

        const documentData: any = results.proc[0].document[0][0];

        return transformDataToWatchContent(documentData);
    } else {
        return undefined;
    }
};
