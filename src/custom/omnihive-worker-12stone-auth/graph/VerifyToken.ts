import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { IsHelper } from "@withonevision/omnihive-core/helpers/IsHelper";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";

class VerifyTokenArgs {
    AuthToken: string = "";
}

export default class VerifyToken extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: VerifyTokenArgs, _omniHiveContext: GraphContext): Promise<any> => {
        try {
            const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

            if (IsHelper.isNullOrUndefined(webRootUrl)) {
                throw new Error("Web Root URL undefined");
            }

            await GraphService.getSingleton().init(this.registeredWorkers, this.environmentVariables);

            const query = `
                query {
                    storedProcedures {
                        data: api_12Stone_Custom_Session_Verify(DomainId: "1", SessionKey: "${customArgs.AuthToken.replace(
                            "BEARER ",
                            ""
                        )}")
                    }
                }
            `;

            GraphService.getSingleton().graphRootUrl = webRootUrl + "/server1/builder1/ministryplatform";

            const results = (await GraphService.getSingleton().runQuery(query)).storedProcedures[0].data[0][0];
            delete results.SessionId;
            delete results.SessionKey;

            return results;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
