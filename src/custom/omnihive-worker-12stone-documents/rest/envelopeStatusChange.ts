import { IRestEndpointWorker } from "@withonevision/omnihive-core/interfaces/IRestEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { RestEndpointExecuteResponse } from "@withonevision/omnihive-core/models/RestEndpointExecuteResponse";

export default class EnvelopeStatusChange extends HiveWorkerBase implements IRestEndpointWorker {
    public getSwaggerDefinition = (): any => {
        return {};
    };
    public execute = async (_headers: any, _url: string, _body: any): Promise<RestEndpointExecuteResponse> => {
        throw new Error("not implemented");
    };
}
