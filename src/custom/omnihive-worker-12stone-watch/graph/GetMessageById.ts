import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { WatchContent } from "@12stonechurch/omnihive-worker-common/models/WatchModels";
import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { getMessageById } from "../common/GetMessaegById";

class GetMessageByIdArguemnts {
    id: number = 0;
}

export default class GetMessageById extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any): Promise<WatchContent | {}> => {
        const args: GetMessageByIdArguemnts = this.checkObjectStructure<GetMessageByIdArguemnts>(
            GetMessageByIdArguemnts,
            customArgs
        );

        if (!args.id) {
            throw new Error("A Message Id is required");
        }

        try {
            GraphService.getSingleton().graphRootUrl =
                this.serverSettings.config.webRootUrl + "/server1/builder1/ministryplatform";

            const latestMessage = await getMessageById(args.id);

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