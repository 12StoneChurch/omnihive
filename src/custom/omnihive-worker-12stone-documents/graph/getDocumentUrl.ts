import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";
import DocuSignWorker from "@12stonechurch/omnihive-worker-docusign";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { getContactData } from "../common/getContactData";

export default class GetDocumentUrl extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any, omniHiveContext: GraphContext): Promise<{}> => {
        await verifyToken(omniHiveContext);

        const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

        const docusignWorker = this.getWorker<DocuSignWorker>("unknown", "DocuSignWorker");

        if (docusignWorker) {
            const contactData: any = await getContactData(webRootUrl + this.metadata.customSlug, customArgs.contactId);
            const email = contactData.email;
            const name = `${contactData.nickname} ${contactData.lastName}`;

            const url = await docusignWorker.getEnvelopeUrl(customArgs.redirectUrl, email, name, customArgs.envelopeId);

            return { url: url };
        }

        throw new Error("DocuSign Worker not configured");
    };
}
