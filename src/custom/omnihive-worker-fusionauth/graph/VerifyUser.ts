import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { SyncUsers } from "../common/SyncUsers";

class VerifyUserArgs {
    username: string = "";
    password: string = "";
}

export default class VerifyUser extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any): Promise<any> => {
        const args: VerifyUserArgs = this.validateArgs(customArgs);

        try {
            return await SyncUsers(args, this.config.metadata, this.serverSettings.config.webRootUrl);
        } catch (err) {
            return serializeError(err);
        }
    };

    private validateArgs = (customArgs: any) => {
        const args: VerifyUserArgs = this.checkObjectStructure<VerifyUserArgs>(VerifyUserArgs, customArgs);

        if (!args.username && !args.password) {
            throw new Error("Username and password is required");
        }

        if (!args.username) {
            throw new Error("Username is required");
        }

        if (!args.password) {
            throw new Error("Password is required");
        }

        return args;
    };
}
