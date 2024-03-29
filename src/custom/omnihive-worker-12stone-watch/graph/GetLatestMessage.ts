import { WatchContent } from "@12stonechurch/omnihive-worker-common/models/WatchModels";
import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import dayjs from "dayjs";
import { serializeError } from "serialize-error";
import { IsHelper } from "@withonevision/omnihive-core/helpers/IsHelper";

import { getMessageById } from "../common/GetMessaegById";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";

export default class GetLatestMessage extends HiveWorkerBase implements IGraphEndpointWorker {
    private getLatestMessageId = async (): Promise<number | undefined> => {
        try {
            let latestSiteDocId: number = 0;

            const latestMessageQuery = `
                query {
                    campaign: cmsCampaignSiteDocuments(campaignId: "= 8", startDate: "<= GetDate()", endDate: "> GetDate()") {
                        id: siteDocumentId,
                        viewOrder,
                        startDate
                    }
                }
            `;

            const response: any = await AwaitHelper.execute(GraphService.getSingleton().runQuery(latestMessageQuery));

            const validSiteDocuments = response.campaign;

            if (validSiteDocuments.length > 1) {
                let latestStartDate = dayjs().subtract(100, "year");
                let topViewOrder = 0;
                let topId = 0;

                validSiteDocuments.forEach((doc: any) => {
                    if (topViewOrder < doc.viewOrder) {
                        topViewOrder = doc.viewOrder;
                        topId = doc.id;
                    } else if (topViewOrder === doc.viewOrder && dayjs(doc.startDate).isAfter(latestStartDate)) {
                        latestStartDate = dayjs(doc.startDate);
                        topId = doc.id;
                    }
                });

                latestSiteDocId = topId;
            } else if (validSiteDocuments.length === 1) {
                latestSiteDocId = validSiteDocuments[0].id;
            } else {
                latestSiteDocId = 0;
            }

            return latestSiteDocId;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return undefined;
        }
    };

    public execute = async (_customArgs: any, _omniHiveContext: GraphContext): Promise<WatchContent | {}> => {
        try {
            const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

            if (IsHelper.isNullOrUndefined(webRootUrl)) {
                throw new Error("Web Root URL undefined");
            }

            await GraphService.getSingleton().init(this.registeredWorkers, this.environmentVariables);
            GraphService.getSingleton().graphRootUrl = webRootUrl + "/server1/builder1/ministryplatform";

            const latestSiteDocId = await this.getLatestMessageId();

            const latestMessage = await getMessageById(latestSiteDocId);

            if (latestMessage) {
                return latestMessage;
            }

            return {};
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return {};
        }
    };
}
