import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import DocuSignWorker from "@12stonechurch/omnihive-worker-docusign";
import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";
import { generateDocument } from "../common/generateDocument";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";

export default class GenerateDocument extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any, omniHiveContext: GraphContext): Promise<{}> => {
        await verifyToken(omniHiveContext);

        const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

        const docusignWorker = this.getWorker<DocuSignWorker>("unknown", "DocuSignWorker");
        const databaseWorker = this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");

        if (docusignWorker && databaseWorker && webRootUrl) {
            return await generateDocument(
                docusignWorker,
                databaseWorker,
                customArgs.templateId,
                webRootUrl,
                this.metadata.customSlug,
                customArgs.role,
                customArgs.redirectUrl,
                customArgs.contactId
            );
        }

        throw new Error("Web Root Url, DocuSign, and/or Database Workers are not properly configured.");
    };
}
