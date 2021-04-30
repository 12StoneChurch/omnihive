import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { ITokenWorker } from "@withonevision/omnihive-core/interfaces/ITokenWorker";
import { HiveWorker } from "@withonevision/omnihive-core/models/HiveWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { FusionAuthClient, IssueResponse, ValidateResponse } from "@fusionauth/typescript-client";
import ClientResponse from "@fusionauth/typescript-client/build/src/ClientResponse";

export class FusionAuthTokenWorkerMetadata {
    authApiKey: string = "";
    authHost: string = "";
    authTenantId: string = "";
    authApplicationId: string = "";
}

export default class FusionAuthTokenWorker extends HiveWorkerBase implements ITokenWorker {
    private metadata!: FusionAuthTokenWorkerMetadata;
    private client: FusionAuthClient | undefined;
    private token: string = "";

    constructor() {
        super();
    }

    public async init(config: HiveWorker): Promise<void> {
        await AwaitHelper.execute<void>(super.init(config));

        try {
            this.metadata = this.checkObjectStructure<FusionAuthTokenWorkerMetadata>(
                FusionAuthTokenWorkerMetadata,
                config.metadata
            );

            this.client = new FusionAuthClient(
                this.metadata.authApiKey,
                this.metadata.authHost,
                this.metadata.authTenantId
            );
        } catch {
            throw new Error("Metadata is malformed for this worker.");
        }
    }

    public get = async (): Promise<string> => {
        const response: ClientResponse<IssueResponse> | undefined = await this.client?.issueJWT(
            this.metadata.authApplicationId,
            this.token,
            ""
        );

        if (response && response.response.token) {
            this.token = response.response.token;
        }

        return "";
    };

    public expired = async (token: string): Promise<boolean> => {
        return this.verify(token);
    };

    public verify = async (accessToken: string): Promise<boolean> => {
        const results: ClientResponse<ValidateResponse> | undefined = await this.client?.validateJWT(accessToken);

        if (results && results.response.jwt) {
            return false;
        }

        throw new Error("[ohAccessError] Access token is not valid");
    };
}
