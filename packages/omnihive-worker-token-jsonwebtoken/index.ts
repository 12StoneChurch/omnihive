import { AwaitHelper } from "@withonevision/omnihive-hive-common/helpers/AwaitHelper";
import { HiveWorker } from "@withonevision/omnihive-hive-common/models/HiveWorker";
import { ITokenWorker } from "@withonevision/omnihive-hive-worker/interfaces/ITokenWorker";
import { HiveWorkerBase } from '@withonevision/omnihive-hive-worker/models/HiveWorkerBase';
import jwt from "jsonwebtoken";
import { serializeError } from "serialize-error";
import { v4 as uuidv4 } from "uuid";
import { nanoid } from "nanoid";

export class JsonWebTokenWorkerMetadata {
    public tokenSecret: string = "";
    public audience: string = "";
    public verifyOn: boolean = true;
}

export default class JsonWebTokenWorker extends HiveWorkerBase implements ITokenWorker {

    private tokenSecret: string = "";
    private audience: string = "";
    private token: string = "";

    constructor() {
        super();
    }

    public async init(config: HiveWorker): Promise<void> {

        await AwaitHelper.execute<void>(super.init(config));
        let metadata: JsonWebTokenWorkerMetadata;

        try {
            metadata = this.hiveWorkerHelper.checkMetadata<JsonWebTokenWorkerMetadata>(JsonWebTokenWorkerMetadata, config.metadata);
        } catch {
            metadata = { 
                audience: uuidv4(),
                tokenSecret: nanoid(64),
                verifyOn: true
            }
        }

        this.tokenSecret = metadata.tokenSecret;
    }

    public get = async (payload?: object): Promise<string> => {

        try {
            if (this.token !== "" && !this.expired(this.token)) {
                return this.token;
            }

            if (!payload) {
                payload = { accessOnly: true }
            }

            this.token = jwt.sign(payload, this.tokenSecret);
            return this.token;
        } catch (err) {
            throw new Error(`Get Token Error => ${JSON.stringify(serializeError(err))}`);
        }
    }

    public expired = async (token: string): Promise<boolean> => {
        return this.verify(token);
    }

    public verify = async (accessToken: string): Promise<boolean> => {

        if (this.config.metadata.verifyOn === false) {
            return true;
        }
        
        try {
            const decoded = jwt.verify(accessToken, this.tokenSecret, { audience: this.audience });

            if(decoded) {
                return true;
            } else {
                return false;
            }
        } catch {
            return false;
        }
    }


}
