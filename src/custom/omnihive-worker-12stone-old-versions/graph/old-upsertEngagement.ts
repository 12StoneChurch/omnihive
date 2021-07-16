import axios from "axios";
import { IGraphEndpointWorker } from "src/packages/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "src/packages/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "src/packages/omnihive-core/models/HiveWorkerBase";

type UpsertEngagementArgs = {
    accountId: number;
    engagementUpsertModels: EngagementUpsertModel[];
};

type EngagementUpsertModel = {
    campusId: number;
    contactId: number;
    engagementId: number;
    accountId: number;
    ownerId: number;
    typeId: number;
    projectId: number;
    statusId: number;
    holdUntil: string;
    originId: number;
    createdById: number;
    previousStatusId: number;
    previousOwnerId: number;
    archived: boolean;
    dateCreated: string;
    details: string;
    engagementNotificationTypeId: number;
    notificationMessage: string;
    sendNotification: boolean;
};

export default class UpsertEngagement extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: UpsertEngagementArgs, _omniHiveContext: GraphContext): Promise<boolean> => {
        try {
            return (
                await axios.post(
                    `${this.metadata.dataGraphRootUrl}/rest/system/engagements/upsert`,
                    JSON.stringify(customArgs)
                )
            ).data;
        } catch (err) {
            throw err;
        }
    };
}