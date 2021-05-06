import FusionAuthClient from "@fusionauth/typescript-client";
import { serializeError } from "serialize-error";
import { syncAuthUser } from "../lib/services/FusionServices";
import { MpCreateUser, MpVerifyEmailUnused, SetDanyMetadata, SetRootUrl } from "../lib/services/OhServices";

class CreateUserArgs {
    firstName: string = "";
    lastName: string = "'";
    email: string = "";
    mobilePhone?: string = "";
    password: string = "";
    confirmPassword: string = "";
}

let _client: FusionAuthClient | undefined = undefined;
let _metadata: any;

export const CreateAuthUser = async (customArgs: any, metadata: any, rootUrl: string): Promise<any> => {
    _metadata = metadata;
    SetDanyMetadata(_metadata);
    SetRootUrl(rootUrl);

    const args: CreateUserArgs = await validateArgs(customArgs);

    try {
        _client = new FusionAuthClient(_metadata.authApiKey, _metadata.authHost, _metadata.authTenantId);

        if (_client) {
            const mpAuthData = await MpCreateUser(args);

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

const validateArgs = async (customArgs: any): Promise<CreateUserArgs> => {
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
