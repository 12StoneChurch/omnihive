import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { danyPost } from "@12stonechurch/omnihive-worker-common/helpers/DanyHelper";
import { DanyService } from "@12stonechurch/omnihive-worker-common/services/DanyService";

class SignInArgs {
    UserName: string = "";
    Password: string = "";
}

export default class SignIn extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any): Promise<any> => {
        try {
            if (customArgs.Data) {
                throw new Error("Unauthorized");
            }

            // Get Metadata
            DanyService.getSingleton().setMetaData(this.metadata);

            // Sanitize arguments
            const trueArgs: any = {};

            Object.keys(customArgs).forEach((key: string) => {
                if (key !== "Data") {
                    trueArgs[key] = customArgs[key];
                }
            });

            // Validate arguments
            this.checkObjectStructure(SignInArgs, trueArgs);

            const result = await AwaitHelper.execute(danyPost("/Security/Login", customArgs));

            if (result) {
                return result.data;
            }

            throw new Error("Invalid username or password");
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
