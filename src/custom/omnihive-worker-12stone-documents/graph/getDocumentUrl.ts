import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";
import DocuSignWorker from "@12stonechurch/omnihive-worker-docusign";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { getDocumentUrl } from "../common/getDocumentUrl";

export default class GetDocumentUrl extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any, omniHiveContext: GraphContext): Promise<{}> => {
        await verifyToken(omniHiveContext);

        const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

        const docusignWorker = this.getWorker<DocuSignWorker>("unknown", "DocuSignWorker");

        if (docusignWorker && webRootUrl) {
            const url = await getDocumentUrl(
                docusignWorker,
                webRootUrl + this.metadata.customSlug,
                customArgs.contactId,
                customArgs.redirectUrl,
                customArgs.envelopeId
            );

            return { url: url };
        }

        throw new Error("DocuSign Worker not configured");
    };
}
