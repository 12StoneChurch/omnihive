import { HiveWorkerBase } from "src/custom/omnihive-worker-12stone-addresses/node_modules/@withonevision/omnihive-core/models/HiveWorkerBase";
import { IGraphEndpointWorker } from "src/packages/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "src/packages/omnihive-core/models/GraphContext";
import DocuSignWorker from "..";

export default class TestGraph extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any, _omniHiveContext: GraphContext): Promise<{}> => {
        const docusignWorker = this.getWorker<DocuSignWorker>("unknown", "DocuSignWorker");

        if (docusignWorker) {
            const id = await docusignWorker.getEnvelopeUrl(
                customArgs.redirectUrl,
                customArgs.email,
                customArgs.name,
                customArgs.envelopeId
            );

            return { envelopeId: id };
        } else {
            throw new Error("DocuSign worker not found.");
        }
    };
}
