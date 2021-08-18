import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { danyPost } from "@12stonechurch/omnihive-worker-common/helpers/DanyHelper";
import { DanyService } from "@12stonechurch/omnihive-worker-common/services/DanyService";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";

class CreateUserArgs {
    AddressLine1: string = "";
    AddressLine2: string = "";
    City: string = "";
    CustomData: string = "";
    Data: string = "";
    Email: string = "";
    FirstName: string = "";
    LastName: string = "";
    Password: string = "";
    PhoneNumber: string = "";
    PostalCode: string = "";
    State: string = "";
}

export default class CreateUser extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: CreateUserArgs, _omniHiveContext: GraphContext): Promise<any> => {
        // Get Metadata
        DanyService.getSingleton().setMetaData(this.metadata);

        const result = await AwaitHelper.execute(danyPost("/Security/Register", customArgs));

        return result.data;
    };
}
