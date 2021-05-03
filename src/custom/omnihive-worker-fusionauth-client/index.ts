import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IAuthWorker } from "@12stonechurch/omnihive-worker-common/interfaces/IAuthWorker";
import { HiveWorker } from "@withonevision/omnihive-core/models/HiveWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import {
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    FusionAuthClient,
    JWTRefreshResponse,
    RefreshRequest,
} from "@fusionauth/typescript-client";
import { CreateAuthUser } from "@12stonechurch/omnihive-worker-common/models/CreateAuthUser";
import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import ClientResponse from "@fusionauth/typescript-client/build/src/ClientResponse";

export class FusionAuthTokenWorkerMetadata {
    apiKey: string = "";
    host: string = "";
    tenantId: string = "";
    applicationId: string = "";
}

export default class FusionAuthAuthWorker extends HiveWorkerBase implements IAuthWorker {
    private metadata!: FusionAuthTokenWorkerMetadata;
    private client: FusionAuthClient | undefined;
    private jwt: { refreshToken: string; token: string } = { refreshToken: "", token: "" };

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

            this.client = new FusionAuthClient(this.metadata.apiKey, this.metadata.host, this.metadata.tenantId);
        } catch {
            throw new Error("Metadata is malformed for this worker.");
        }
    }

    public login = async (username: string, password: string): Promise<any> => {
        const logInQuery = `
            query {
                data: VerifyAuthUser(customArgs: {
                    username: "${username}",
                    password: "${password}",
                })
            }
        `;

        GraphService.getSingleton().graphRootUrl = this.serverSettings.config.webRootUrl + "/server1/custom/graphql";

        return (await GraphService.getSingleton().runQuery(logInQuery)).data;
    };

    public createUser = async (userData: CreateAuthUser): Promise<any> => {
        const createUserQuery = `
            query {
                data: CreateAuthUser(customArgs: {
                    firstName: "${userData.firstName}",
                    lastName: "${userData.lastName}",
                    email: "${userData.email}",
                    password: "${userData.password}",
                    confirmPassword: "${userData.confirmPassword}"
                    mobilePhone: "${userData.mobilePhone}",
                })
            }
        `;

        GraphService.getSingleton().graphRootUrl = this.serverSettings.config.webRootUrl + "/server1/custom/graphql";

        return (await GraphService.getSingleton().runQuery(createUserQuery)).data;
    };

    public forgotPassword = async (email: string): Promise<ForgotPasswordResponse | undefined> => {
        const request: ForgotPasswordRequest = {
            applicationId: this.metadata.applicationId,
            email: email,
            sendForgotPasswordEmail: true,
        };

        return (await this.client?.forgotPassword(request))?.response;
    };

    public refreshToken = async (): Promise<void> => {
        const request: RefreshRequest = {
            refreshToken: this.jwt.refreshToken,
            token: this.jwt.token,
        };
        const response: ClientResponse<JWTRefreshResponse> | undefined = await this.client?.exchangeRefreshTokenForJWT(
            request
        );

        this.jwt = {
            refreshToken: response?.response.refreshToken ?? "",
            token: response?.response.token ?? "",
        };
    };
}
