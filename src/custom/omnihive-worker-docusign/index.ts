import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { serializeError } from "serialize-error";
import docusign, { EnvelopeDefinition, TemplateRole } from "docusign-esign";

export class DocuSignWorkerMetadata {
    public clientId: string = "";
    public userId: string = "";
    public oAuthBasePath: string = "";
    public expiresIn: string = "";
    public scope: string = "";
    public signingAlgorithm: string = "";
    public privateKey: string = "";
}

export default class DocuSignWorker extends HiveWorkerBase {
    private _userInfo: any;
    private _client?: docusign.ApiClient;

    constructor() {
        super();
    }

    public async init(name: string, metadata?: any) {
        try {
            await AwaitHelper.execute<void>(super.init(name, metadata));

            this.checkObjectStructure<DocuSignWorkerMetadata>(DocuSignWorkerMetadata, metadata);
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    }

    public authenticate = async () => {
        this.setClient();

        if (this._client) {
            const response = await this._client.requestJWTUserToken(
                this.metadata.clientId,
                this.metadata.userId,
                this.metadata.scope.split(" "),
                this.metadata.privateKey,
                this.metadata.expiresIn
            );

            this._client.addDefaultHeader("Authorization", `BEARER ${response.body.access_token}`);

            this._userInfo = await this._client.getUserInfo(response.body.access_token);
        }
    };

    public createEnvelope = async (
        templateId: string,
        email: string,
        name: string,
        role: string,
        clientUserId?: any
    ) => {
        await this.authenticate();

        const envDef = { envelopeDefinition: this.makeEnvelope(templateId, email, name, role, clientUserId) };
        try {
            if (this._client && this._userInfo && this._userInfo.accounts && this._userInfo.accounts.length > 0) {
                this._client.setBasePath(this._userInfo.accounts[0].baseUri + "/restapi");

                const envelopesApi = new docusign.EnvelopesApi(this._client);

                return await envelopesApi.createEnvelope(this._userInfo.accounts[0].accountId, envDef);
            }
        } catch (err) {
            throw err;
        }

        throw new Error("Authentication error");
    };

    private makeEnvelope = (templateId: string, email: string, name: string, role: string, clientUserId: any) => {
        const envDef: EnvelopeDefinition = {};

        envDef.templateId = templateId;

        const signer: TemplateRole = {
            email: email,
            name: name,
            roleName: role,
            clientUserId: clientUserId,
        };

        envDef.templateRoles = [signer];
        envDef.status = "sent";

        return envDef;
    };

    public getEnvelopeUrl = async (redirectUrl: string, email: string, name: string, envelopeId: string) => {
        await this.authenticate();

        if (this._client && this._userInfo && this._userInfo.accounts && this._userInfo.accounts.length > 0) {
            const envelopesApi = new docusign.EnvelopesApi(this._client);
            this._client.setBasePath(this._userInfo.accounts[0].baseUri + "/restapi");

            const recipientsData = await envelopesApi.listRecipients(this._userInfo.accounts[0].accountId, envelopeId);
            const userId = recipientsData.signers?.[0]?.clientUserId;

            const viewRequest = {
                recipientViewRequest: {
                    returnUrl: redirectUrl,
                    authenticationMethod: "none",
                    email: email,
                    userName: name,
                    clientUserId: userId,
                },
            };

            return await envelopesApi.createRecipientView(
                this._userInfo.accounts[0].accountId,
                envelopeId,
                viewRequest
            );
        }

        throw new Error("Authentication error");
    };

    private setClient = () => {
        this._client = new docusign.ApiClient({
            basePath: this._userInfo?.accounts?.[0]?.base_uri ?? "",
            oAuthBasePath: this.metadata.oAuthBasePath,
        });
        this._client.setOAuthBasePath(this.metadata.oAuthBasePath);
    };
}
