import { IHiveWorker } from "@withonevision/omnihive-core/interfaces/IHiveWorker";
import { CreateAuthUser } from "../models/CreateAuthUser";
import { ForgotPasswordResponse } from "@fusionauth/typescript-client";

export interface IAuthWorker extends IHiveWorker {
    login: (username: string, password: string) => Promise<any>;
    createUser: (userData: CreateAuthUser) => Promise<any>;
    forgotPassword: (email: string) => Promise<ForgotPasswordResponse | undefined>;
    refreshToken: () => Promise<void>;
}
