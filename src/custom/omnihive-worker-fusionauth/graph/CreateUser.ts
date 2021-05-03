import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { DanyService } from "@12stonechurch/omnihive-worker-common/services/DanyService";
import { buildAuthUser, MpCreateUser, MpVerifyEmailUnused } from "../common/MpAuthFunctions";
import {
    FusionAuthClient,
    RegistrationRequest,
    RegistrationResponse,
    SearchResponse,
    User,
    UserRegistration,
} from "@fusionauth/typescript-client";
import ClientResponse from "@fusionauth/typescript-client/build/src/ClientResponse";

class CreateUserArgs {
    firstName: string = "";
    lastName: string = "'";
    email: string = "";
    mobilePhone?: string = "";
    password: string = "";
    confirmPassword: string = "";
}

export default class CreateUser extends HiveWorkerBase implements IGraphEndpointWorker {
    private _client: FusionAuthClient | undefined = undefined;

    public execute = async (customArgs: any): Promise<any> => {
        GraphService.getSingleton().graphRootUrl =
            this.serverSettings.config.webRootUrl + "/server1/builder1/ministryplatform";

        const args: CreateUserArgs = await this.validateArgs(customArgs);

        try {
            this._client = new FusionAuthClient(
                this.config.metadata.authApiKey,
                this.config.metadata.authHost,
                this.config.metadata.authTenantId
            );

            if (this._client) {
                DanyService.getSingleton().setMetaData(this.config.metadata);
                GraphService.getSingleton().graphRootUrl =
                    this.serverSettings.config.webRootUrl + "/server1/custom/graphql";

                const mpAuthData = await MpCreateUser(args);

                if (mpAuthData) {
                    GraphService.getSingleton().graphRootUrl =
                        this.serverSettings.config.webRootUrl + "/server1/builder1/ministryplatform";

                    return await this.syncAuthUser(args, mpAuthData);
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

    private validateArgs = async (customArgs: any): Promise<CreateUserArgs> => {
        if (!customArgs.firstName) {
            throw new Error("First Name is required");
        }

        if (!customArgs.lastName) {
            throw new Error("Last Name is required");
        }

        if (!customArgs.email) {
            throw new Error("Email is required");
        }

        if (!customArgs.password) {
            throw new Error("Password is required");
        }

        if (!customArgs.confirmPassword) {
            throw new Error("Confirm Password is required");
        }

        if (customArgs.confirmPassword !== customArgs.password) {
            throw new Error("Confirm Password does not match Password.");
        }

        const mpValid = await MpVerifyEmailUnused(customArgs.email);

        if (!mpValid) {
            throw new Error("Email address already exists in the system");
        }

        return customArgs;
    };

    private syncAuthUser = async (args: CreateUserArgs, mpAuthData: any): Promise<any> => {
        if (this._client) {
            const userExists: ClientResponse<SearchResponse> = await this._client.searchUsersByQuery({
                search: { queryString: args.email },
            });

            if (!userExists.response.total || userExists.response.total <= 0) {
                const authUserRequest: RegistrationRequest = await this.buildRegistrationRequest(
                    mpAuthData,
                    args.password
                );
                const userCreated: ClientResponse<RegistrationResponse> = await this._client.register(
                    "",
                    authUserRequest
                );

                return userCreated.response;
            } else if (userExists.response.total === 1 && userExists?.response?.users?.[0]) {
                if (!userExists.response.users[0].data?.syncedFromMp) {
                    const authRegistrationRequest: RegistrationRequest = await this.buildRegistrationRequest(
                        mpAuthData,
                        args.password
                    );

                    const id: string = userExists?.response?.users?.[0]?.id ? userExists.response.users[0].id : "";
                    const userUpdated: ClientResponse<RegistrationResponse> = await this._client.updateUser(
                        id,
                        authRegistrationRequest
                    );

                    if (
                        !userExists.response.users[0].registrations?.some(
                            (x: UserRegistration) => x.applicationId === this.config.metadata.authApplicationId
                        )
                    ) {
                        delete authRegistrationRequest.user;
                        await this._client.register(id, authRegistrationRequest);
                    }

                    return userUpdated.response;
                }
            } else {
                throw new Error("Multiple users found with same id.");
            }
        }
    };

    private buildRegistrationRequest = async (mpAuthData: any, password: string): Promise<RegistrationRequest> => {
        const authUser: User = await buildAuthUser(mpAuthData, this.config.metadata.authTenantId);

        const authRegistrationRequest: RegistrationRequest = {
            generateAuthenticationToken: true,
            sendSetPasswordEmail: false,
            skipVerification: true,
            skipRegistrationVerification: true,
            registration: {
                applicationId: this.config.metadata.authApplicationId,
                roles: ["User"],
                username: mpAuthData.UserName,
                verified: true,
            },
            user: {
                ...authUser,
                password: password,
            },
        };

        return authRegistrationRequest;
    };
}
