import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { ITokenWorker } from "@withonevision/omnihive-core/interfaces/ITokenWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";

export const verifyToken = async (omniHiveContext: GraphContext): Promise<void> => {
    const tokenWorker: ITokenWorker | undefined = global.omnihive.getWorker<ITokenWorker | undefined>(
        HiveWorkerType.Token
    );
    // Gather the security flag
    let disableSecurity: boolean =
        !global.omnihive.getEnvironmentVariable<boolean>("OH_SECURITY_TOKEN_VERIFY") ?? false;
    // If security is enabled and no worker is found then throw an error
    if (!disableSecurity && !tokenWorker) {
        throw new Error("[ohAccessError] No token worker defined.");
    }
    // If security is enabled but the access token is blank then throw an error
    if (!disableSecurity && tokenWorker && !omniHiveContext?.access) {
        throw new Error("[ohAccessError] Access token is invalid or expired.");
    }
    // If security is enabled and the access token is provided then verify the token
    if (!disableSecurity && tokenWorker && omniHiveContext?.access) {
        const verifyToken: boolean = await AwaitHelper.execute(tokenWorker.verify(omniHiveContext.access));
        // If the token is invalid then throw an error
        if (!verifyToken) {
            throw new Error("[ohAccessError] Access token is invalid or expired.");
        }
    }
};
