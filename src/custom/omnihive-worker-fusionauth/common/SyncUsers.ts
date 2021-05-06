import FusionAuthClient from "@fusionauth/typescript-client";
import { serializeError } from "serialize-error";
import { syncAuthUser } from "../lib/services/FusionServices";
import { MpLogin, SetDanyMetadata, SetRootUrl } from "../lib/services/OhServices";

let _client: FusionAuthClient;
let metadata: any;

export const SyncUsers = async (args: any, workerMetadata: any, rootUrl: string) => {
    metadata = workerMetadata;

    try {
        _client = new FusionAuthClient(metadata.authApiKey, metadata.authHost, metadata.authTenantId);

        if (_client) {
            SetDanyMetadata(metadata);
            SetRootUrl(rootUrl);
            const mpAuthData = await MpLogin(args.loginId, args.password);

            if (mpAuthData) {
                return await syncAuthUser(args, mpAuthData, _client, metadata);
            } else {
                throw new Error("Invalid Username or Password");
            }
        } else {
            throw new Error("Auth Worker failed to initialize properly");
        }
    } catch (err) {
        return serializeError(err);
    }
};
