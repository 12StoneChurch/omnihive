import { IRestEndpointWorker } from "@withonevision/omnihive-core/interfaces/IRestEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import swaggerUi from "swagger-ui-express";
import { GetMpUser } from "../common/GetMpUser";

class SignInArgs {
    loginId: string = "";
    password: string = "";
    applicationId: string = "";
    noJWT: boolean = false;
    ipAddress: string = "";
}

export default class FusionSignIn extends HiveWorkerBase implements IRestEndpointWorker {
    public getSwaggerDefinition = (): swaggerUi.JsonObject | undefined => {
        return {
            definitions: {
                FusionAuthUser: {
                    properties: {
                        user: {
                            type: "object",
                        },
                    },
                },
            },
            paths: {
                "/FusionAuth/SignIn": {
                    post: {
                        description: "Sign In User to MP and grab data to create FusionAuth user",
                        tags: [
                            {
                                name: "FusionAuth",
                            },
                        ],
                        parameters: [
                            {
                                in: "body",
                                name: "loginId",
                                require: true,
                                schema: {
                                    type: "string",
                                },
                                description: "UserId/Email",
                            },
                            {
                                in: "body",
                                name: "password",
                                schema: {
                                    type: "string",
                                },
                                description: "User password",
                            },
                            {
                                in: "body",
                                name: "applicationId",
                                schema: {
                                    type: "string",
                                },
                                description: "FusionAuth ApplicationId user is authenticating to",
                            },
                            {
                                in: "body",
                                name: "noJWT",
                                schema: {
                                    type: "boolean",
                                },
                                description: "Return a JWT token",
                            },
                            {
                                in: "body",
                                name: "ipAddress",
                                schema: {
                                    type: "string",
                                },
                                description: "IP Address the user is authenticating from",
                            },
                        ],
                        responses: {
                            "200": {
                                description: "FusionAuth User",
                                content: {
                                    "application/json": {
                                        schema: {
                                            $ref: "#/definitions/FusionAuthUser",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        };
    };

    public execute = async (_headers: any, _url: string, body: any): Promise<any> => {
        const args: SignInArgs = this.validateArgs(body);

        try {
            return await GetMpUser(args, this.config.metadata.data, this.serverSettings.config.webRootUrl);
        } catch (err) {
            return serializeError(err);
        }
    };

    private validateArgs = (customArgs: any) => {
        const args: SignInArgs = this.checkObjectStructure<SignInArgs>(SignInArgs, customArgs);

        if (!args.loginId && !args.password) {
            throw new Error("Username and password is required");
        }

        if (!args.loginId) {
            throw new Error("Username is required");
        }

        if (!args.password) {
            throw new Error("Password is required");
        }

        return args;
    };
}
