import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { OmniHiveLogLevel } from "@withonevision/omnihive-core/enums/OmniHiveLogLevel";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { StringHelper } from "@withonevision/omnihive-core/helpers/StringHelper";
import { ILogWorker } from "@withonevision/omnihive-core/interfaces/ILogWorker";
import { IUserWorker } from "@withonevision/omnihive-core/interfaces/IUserWorker";
import { AuthUser } from "@withonevision/omnihive-core/models/AuthUser";
import { HiveWorker } from "@withonevision/omnihive-core/models/HiveWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { CommonStore } from "@withonevision/omnihive-core/stores/CommonStore";
import {
    AppMetadata,
    AuthenticationClient,
    CreateUserData,
    ManagementClient,
    PasswordGrantOptions,
    ResetPasswordEmailOptions,
    TokenResponse,
    UpdateUserData,
    User,
    UserMetadata,
} from "auth0";
import { serializeError } from "serialize-error";

export class AuthZeroUserWorkerMetadata {
    public clientId: string = "";
    public clientSecret: string = "";
    public domain: string = "";
    public connection: string = "";
}

export default class AuthZeroUserWorker extends HiveWorkerBase implements IUserWorker {
    private metadata!: AuthZeroUserWorkerMetadata;
    private authClient!: AuthenticationClient;
    private managementClient!: ManagementClient;
    private logWorker: ILogWorker | undefined = undefined;

    constructor() {
        super();
    }

    public async init(config: HiveWorker): Promise<void> {
        try {
            await AwaitHelper.execute<void>(super.init(config));

            this.metadata = this.checkObjectStructure<AuthZeroUserWorkerMetadata>(
                AuthZeroUserWorkerMetadata,
                config.metadata
            );

            this.authClient = new AuthenticationClient({
                domain: this.metadata.domain,
                clientId: this.metadata.clientId,
                clientSecret: this.metadata.clientSecret,
            });

            this.managementClient = new ManagementClient({
                domain: this.metadata.domain,
                clientId: this.metadata.clientId,
                clientSecret: this.metadata.clientSecret,
                scope: "read:users update:users delete:users",
            });
        } catch (err) {
            console.log("User Init Error => " + JSON.stringify(serializeError(err)));
        }
    }

    public async afterInit(): Promise<void> {
        this.logWorker = await AwaitHelper.execute<ILogWorker | undefined>(
            CommonStore.getInstance().getHiveWorker<ILogWorker | undefined>(HiveWorkerType.Log)
        );

        if (!this.logWorker) {
            throw new Error("Log Worker Not Defined.  Cross-Storage Will Not Function Without Log Worker.");
        }
    }

    public create = async (email: string, password: string): Promise<AuthUser> => {
        if (StringHelper.isNullOrWhiteSpace(email) || StringHelper.isNullOrWhiteSpace(password)) {
            throw new Error("All parameters must be valid strings");
        }

        try {
            const authUser: AuthUser = new AuthUser();
            const createUserData: CreateUserData = { connection: this.metadata.connection, email, password };

            await AwaitHelper.execute<User<AppMetadata, UserMetadata>>(
                this.managementClient.createUser(createUserData)
            );
            authUser.email = email;

            return authUser;
        } catch (err) {
            const error = `Create User Error => ${JSON.stringify(serializeError(err))}`;
            this.logWorker?.write(OmniHiveLogLevel.Error, error);
            throw new Error(error);
        }
    };

    public get = async (email: string): Promise<AuthUser> => {
        if (StringHelper.isNullOrWhiteSpace(email)) {
            throw new Error("Must have an email to search by");
        }

        let fullUser: User<AppMetadata, UserMetadata> | undefined = undefined;
        let user: User | undefined = undefined;

        try {
            const users: User<AppMetadata, UserMetadata>[] = await AwaitHelper.execute<
                User<AppMetadata, UserMetadata>[]
            >(this.managementClient.getUsersByEmail(email));

            if (users.length === 0) {
                throw new Error("User cannot be found");
            }

            user = users[0];

            if (!user || !user.user_id) {
                throw new Error("User cannot be found");
            }

            fullUser = await AwaitHelper.execute<User<AppMetadata, UserMetadata>>(
                this.managementClient.getUser({ id: user.user_id })
            );

            if (!fullUser) {
                throw new Error("Full user cannot be found");
            }

            const authUser: AuthUser = new AuthUser();
            authUser.email = email;

            if (fullUser.given_name) {
                authUser.firstName = fullUser.given_name;
            }

            if (fullUser.family_name) {
                authUser.lastName = fullUser.family_name;
            }

            if (fullUser.phone_number) {
                authUser.phoneNumber = fullUser.phone_number;
            }

            if (
                (fullUser.email && fullUser.nickname && fullUser.email.includes(fullUser.nickname)) ||
                !user ||
                !user.nickname
            ) {
                authUser.nickname = "";
            } else {
                authUser.nickname = user.nickname;
            }

            if (
                (!StringHelper.isNullOrWhiteSpace(authUser.firstName) ||
                    !StringHelper.isNullOrWhiteSpace(authUser.nickname)) &&
                !StringHelper.isNullOrWhiteSpace(authUser.lastName)
            ) {
                if (!StringHelper.isNullOrWhiteSpace(authUser.nickname)) {
                    authUser.fullName = fullUser.nickname + " " + fullUser.family_name;
                } else {
                    authUser.fullName = fullUser.given_name + " " + fullUser.family_name;
                }
            }

            if (
                fullUser.user_metadata &&
                fullUser.user_metadata.address &&
                user?.user_metadata &&
                user.user_metadata.address &&
                !StringHelper.isNullOrWhiteSpace(user.user_metadata.address)
            ) {
                authUser.address = fullUser.user_metadata.address;
            }

            return authUser;
        } catch (err) {
            const error = `Get User Error => ${JSON.stringify(serializeError(err))}`;
            this.logWorker?.write(OmniHiveLogLevel.Error, error);
            throw new Error(error);
        }
    };

    public login = async (email: string, password: string): Promise<AuthUser> => {
        if (StringHelper.isNullOrWhiteSpace(email) || StringHelper.isNullOrWhiteSpace(password)) {
            throw new Error("All parameters must be valid strings");
        }

        try {
            const databaseLoginData: PasswordGrantOptions = {
                realm: this.metadata.connection,
                username: email,
                password,
            };
            await AwaitHelper.execute<TokenResponse>(this.authClient.passwordGrant(databaseLoginData));
        } catch (err) {
            const error = `Login Error => ${JSON.stringify(serializeError(err))}`;
            this.logWorker?.write(OmniHiveLogLevel.Error, error);
            throw new Error(error);
        }

        return this.get(email);
    };

    public passwordChangeRequest = async (email: string): Promise<boolean> => {
        if (StringHelper.isNullOrWhiteSpace(email)) {
            throw new Error("All parameters must be valid strings");
        }

        const changePasswordData: ResetPasswordEmailOptions = { email, connection: this.metadata.connection };

        try {
            await AwaitHelper.execute<any>(this.authClient.requestChangePasswordEmail(changePasswordData));
        } catch (err) {
            const error = `Change Password Error => ${JSON.stringify(serializeError(err))}`;
            this.logWorker?.write(OmniHiveLogLevel.Error, error);
            throw new Error(error);
        }

        return true;
    };

    public update = async (userName: string, authUser: AuthUser): Promise<AuthUser> => {
        if (StringHelper.isNullOrWhiteSpace(userName) || !authUser) {
            throw new Error("Must have a username and some valid properties to update.");
        }

        let user: User | undefined = undefined;

        try {
            const users = await AwaitHelper.execute<User<AppMetadata, UserMetadata>[]>(
                this.managementClient.getUsersByEmail(userName)
            );
            user = users[0];

            if (!user || !user.user_id) {
                throw new Error("User cannot be found");
            }

            const userData: UpdateUserData = {};

            if (!StringHelper.isNullOrWhiteSpace(authUser.email) && userName !== authUser.email) {
                userData.email = authUser.email;
            } else {
                userData.email = userName;
                authUser.email = userName;
            }

            if (!StringHelper.isNullOrWhiteSpace(authUser.firstName)) {
                userData.given_name = authUser.firstName;
            }

            if (!StringHelper.isNullOrWhiteSpace(authUser.lastName)) {
                userData.family_name = authUser.lastName;
            }

            if (
                user.email &&
                user.nickname &&
                user.email.includes(user.nickname) &&
                !StringHelper.isNullOrWhiteSpace(authUser.firstName)
            ) {
                userData.nickname = authUser.firstName;
            }

            if (
                (!StringHelper.isNullOrWhiteSpace(authUser.firstName) ||
                    !StringHelper.isNullOrWhiteSpace(authUser.nickname)) &&
                !StringHelper.isNullOrWhiteSpace(authUser.lastName)
            ) {
                if (!StringHelper.isNullOrWhiteSpace(authUser.nickname)) {
                    userData.name = authUser.nickname + " " + authUser.lastName;
                } else {
                    userData.name = authUser.firstName + " " + authUser.lastName;
                }
            }

            if (!StringHelper.isNullOrWhiteSpace(authUser.nickname)) {
                userData.nickname = authUser.nickname;
            }

            if (!StringHelper.isNullOrWhiteSpace(authUser.phoneNumber)) {
                userData.phone_number = authUser.phoneNumber;
            }

            await AwaitHelper.execute<User<AppMetadata, UserMetadata>>(
                this.managementClient.updateUser({ id: user.user_id }, userData)
            );

            const userMetaData: any = {};

            if (StringHelper.isNullOrWhiteSpace(authUser.address)) {
                userMetaData.address = authUser.address;
            }

            await AwaitHelper.execute<User<AppMetadata, UserMetadata>>(
                this.managementClient.updateUserMetadata({ id: user.user_id }, userMetaData)
            );
        } catch (err) {
            const error = `Update User Error => ${JSON.stringify(serializeError(err))}`;
            this.logWorker?.write(OmniHiveLogLevel.Error, error);
            throw new Error(error);
        }

        return this.get(authUser.email);
    };

    public delete = async (id: string): Promise<string> => {
        if (StringHelper.isNullOrWhiteSpace(id)) {
            throw new Error("All parameters must be valid strings");
        }

        try {
            const deleteUserData: any = { id };

            await AwaitHelper.execute<void>(this.managementClient.deleteUser(deleteUserData));

            return "User successfully deleted";
        } catch (err) {
            const error = `Delete User Error => ${JSON.stringify(serializeError(err))}`;
            this.logWorker?.write(OmniHiveLogLevel.Error, error);
            throw new Error(error);
        }
    };

    public getUserIdByEmail = async (email: string): Promise<string | undefined> => {
        if (StringHelper.isNullOrWhiteSpace(email)) {
            throw new Error("Must provide an email to search.");
        }

        let user: User | undefined = undefined;

        try {
            const users = await AwaitHelper.execute<User<AppMetadata, UserMetadata>[]>(
                this.managementClient.getUsersByEmail(email)
            );
            user = users[0];

            if (!user || !user.user_id) {
                return undefined;
            } else {
                return user.user_id;
            }
        } catch (err) {
            const error = `Get UserId By Email Error => ${JSON.stringify(serializeError(err))}`;
            this.logWorker?.write(OmniHiveLogLevel.Error, error);
            throw new Error(error);
        }
    };
}
