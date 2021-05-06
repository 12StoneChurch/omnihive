import FusionAuthClient, {
    LoginRequest,
    RegistrationRequest,
    RegistrationResponse,
    SearchResponse,
    User,
    UserRegistration,
} from "@fusionauth/typescript-client";
import ClientResponse from "@fusionauth/typescript-client/build/src/ClientResponse";
import dayjs from "dayjs";
import { buildAuthUser } from "./OhServices";

export const buildRegistrationRequest = async (
    mpAuthData: any,
    password: string,
    metadata: any
): Promise<RegistrationRequest> => {
    const authUser: User = await buildAuthUser(mpAuthData, metadata.authTenantId);

    const authRegistrationRequest: RegistrationRequest = {
        generateAuthenticationToken: true,
        sendSetPasswordEmail: false,
        skipVerification: true,
        skipRegistrationVerification: true,
        registration: {
            applicationId: metadata.authApplicationId,
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

export const getUserData = async (mpAuthData: any, metadata: any) => {
    return {
        user: {
            active: true,
            verified: true,
            data: {
                mpUserId: mpAuthData.UserId,
                mpContactId: mpAuthData.ContactId,
                migrated: true,
            },
            registrations: [
                {
                    applicationId: metadata.authApplicationId,
                    roles: ["User"],
                    username: mpAuthData.UserName,
                    verified: true,
                    insertInstant: dayjs().unix(),
                },
            ],
            email: mpAuthData.UserName,
            firstName: mpAuthData.DisplayName.split(" ")[0],
            fullName: mpAuthData.DisplayName,
            lastName: mpAuthData.DisplayName.split(" ")[1],
            passwordChangeRequired: false,
            twoFactorEnabled: false,
            usernameStatus: "ACTIVE",
            username: mpAuthData.UserName,
        },
    };
};

export const syncAuthUser = async (
    args: any,
    mpAuthData: any,
    client: FusionAuthClient,
    metadata: any
): Promise<any> => {
    if (client) {
        const userExists: ClientResponse<SearchResponse> = await client.searchUsersByQuery({
            search: { queryString: args.email },
        });

        if (!userExists.response.total || userExists.response.total <= 0) {
            const authUserRequest: RegistrationRequest = await buildRegistrationRequest(
                mpAuthData,
                args.password,
                metadata
            );
            const userCreated: ClientResponse<RegistrationResponse> = await client.register("", authUserRequest);

            return userCreated.response;
        } else if (userExists.response.total === 1 && userExists?.response?.users?.[0]) {
            if (!userExists.response.users[0].data?.syncedFromMp) {
                const authRegistrationRequest: RegistrationRequest = await buildRegistrationRequest(
                    mpAuthData,
                    args.password,
                    metadata
                );

                const id: string = userExists?.response?.users?.[0]?.id ? userExists.response.users[0].id : "";
                const userUpdated: ClientResponse<RegistrationResponse> = await client.updateUser(
                    id,
                    authRegistrationRequest
                );

                if (
                    !userExists.response.users[0].registrations?.some(
                        (x: UserRegistration) => x.applicationId === metadata.authApplicationId
                    )
                ) {
                    delete authRegistrationRequest.user;
                    await client.register(id, authRegistrationRequest);
                }

                return userUpdated.response;
            }

            const request: LoginRequest = {
                loginId: args.email,
                password: args.password,
                applicationId: metadata.applicationId,
                noJWT: args.noJWT,
                ipAddress: args.ipAddress,
            };

            return client.login(request);
        } else {
            throw new Error("Multiple users found with same id.");
        }
    }
};
