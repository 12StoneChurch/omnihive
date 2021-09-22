import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { getDocumentUrl } from "../common/getDocumentUrl";

export default class GetDocumentUrl extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any, omniHiveContext: GraphContext): Promise<{}> => {
        await verifyToken(omniHiveContext);

        const url = await getDocumentUrl(this, customArgs.contactId, customArgs.redirectUrl, customArgs.documentId);

        return { url: url };
    };
}
