import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { CreateAuthUser } from "../common/CreateAuthUser";

export default class CreateUser extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any): Promise<any> => {
        try {
            return await CreateAuthUser(customArgs, this.config.metadata, this.serverSettings.config.webRootUrl);
        } catch (err) {
            return serializeError(err);
        }
    };
}
