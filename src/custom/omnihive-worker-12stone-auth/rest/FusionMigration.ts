import { IRestEndpointWorker } from "@withonevision/omnihive-core/interfaces/IRestEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { IsHelper } from "@withonevision/omnihive-core/helpers/IsHelper";
import swaggerUi from "swagger-ui-express";
import { GetMpUser } from "../common/GetMpUser";
import { GraphService } from "src/custom/omnihive-worker-12stone-common/services/GraphService";

class SignInArgs {
    loginId: string = "";
    password: string = "";
}

export default class FusionSignIn extends HiveWorkerBase implements IRestEndpointWorker {
    public getSwaggerDefinition = (): swaggerUi.JsonObject | undefined => {
        return {
            definitions: {
                FusionAuthUser: {
                    properties: {
                        user: {
                            type: "object",
                            properties: {
                                active: {
                                    type: "boolean",
                                },
                                data: {
                                    type: "object",
                                    properties: {
                                        mpUserId: {
                                            type: "number",
                                        },
                                        mpContactId: {
                                            type: "number",
                                        },
                                    },
                                },
                                registrations: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            applicationId: {
                                                type: "string",
                                            },
                                            roles: {
                                                type: "array",
                                                items: {
                                                    type: "string",
                                                },
                                            },
                                            username: {
                                                type: "string",
                                            },
                                            verified: {
                                                type: "boolean",
                                            },
                                            insertInstant: {
                                                type: "Date",
                                            },
                                        },
                                    },
                                },
                                email: {
                                    type: "string",
                                },
                                firstName: {
                                    type: "string",
                                },
                                fullName: {
                                    type: "string",
                                },
                                lastName: {
                                    type: "string",
                                },
                                passwordChangeRequired: {
                                    type: "boolean",
                                },
                                twoFactorEnabled: {
                                    type: "boolean",
                                },
                                usernameStatus: {
                                    type: "string",
                                },
                                username: {
                                    type: "string",
                                },
                            },
                        },
                    },
                },
            },
            paths: {
                "/FusionAuth/GetUser": {
                    post: {
                        description: "Sign In User to MP and grab data to create FusionAuth user",
                        tags: [
                            {
                                name: "FusionAuth",
                            },
                        ],
                        requestBody: {
                            name: "credentials",
                            require: true,
                            description: "Login Credentials",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            loginId: {
                                                type: "string",
                                            },
                                            password: {
                                                type: "string",
                                            },
                                            applicationId: {
                                                type: "string",
                                                default: "",
                                            },
                                            noJWT: {
                                                type: "boolean",
                                                default: false,
                                            },
                                            ipAddress: {
                                                type: "string",
                                                default: "",
                                            },
                                        },
                                    },
                                },
                            },
                        },
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
            const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

            if (IsHelper.isNullOrUndefined(webRootUrl)) {
                throw new Error("Web Root URL undefined");
            }

            await GraphService.getSingleton().init(this.registeredWorkers, this.environmentVariables);

            const user = await GetMpUser(args, this.metadata.data, webRootUrl);

            return { response: user, status: 200 };
        } catch (err) {
            return serializeError(err);
        }
    };

    private validateArgs = (args: any) => {
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
