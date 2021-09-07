import FusionAuthClient, { ChangePasswordRequest } from "@fusionauth/typescript-client";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { DanyService } from "@12stonechurch/omnihive-worker-common/services/DanyService";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { danyPost } from "src/custom/omnihive-worker-12stone-common/helpers/DanyHelper";

export default class ForgotPassword extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any, _omniHiveContext: GraphContext): Promise<any> => {
        const response: { fusionResponseCode?: number; danyResponseCode?: number } = {};

        response.fusionResponseCode = await this.changeFusionAuthPassword(customArgs);
        response.danyResponseCode = await this.changeMpPassword(customArgs);

        return response;
    };

    private changeFusionAuthPassword = async (customArgs: any): Promise<number> => {
        try {
            const client = new FusionAuthClient(
                this.metadata.fusionAuthKey,
                this.metadata.hostUrl,
                this.metadata.tenantId
            );

            const request: ChangePasswordRequest = {
                currentPassword: customArgs.currentPassword,
                loginId: customArgs.userId,
                password: customArgs.newPassword,
                refreshToken: customArgs.refreshToken,
            };

            return (await AwaitHelper.execute(client.changePasswordByIdentity(request))).statusCode;
        } catch (err) {
            console.log("FusionAuth error: ", err);
            return 500;
        }
    };

    private changeMpPassword = async (customArgs: any) => {
        const danyMetadata = {
            apiKey: this.metadata.danyKey,
            rootUrl: this.metadata.rootUrl,
        };

        DanyService.getSingleton().setMetaData(danyMetadata);

        const authArgs = {
            Data: "",
            UserName: customArgs.userId,
            Password: customArgs.currentPassword,
        };

        const authData = (await AwaitHelper.execute(danyPost("/Security/Login", authArgs))).data;

        const changePasswordArgs = {
            NewPassword: customArgs.newPassword,
        };

        const result = await AwaitHelper.execute(
            danyPost("/Security/ChangePassword", changePasswordArgs, `BEARER ${authData.AuthenticationToken}`)
        );

        return result.statusCode;
    };
}
