import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IEncryptionWorker } from "@withonevision/omnihive-core/interfaces/IEncryptionWorker";
import { HiveWorker } from "@withonevision/omnihive-core/models/HiveWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import forge from "node-forge";

export class NodeForgeEncryptionWorkerMetadata {
    public encryptionKey: string = "";
}

export default class NodeForgeEncryptionWorker extends HiveWorkerBase implements IEncryptionWorker {
    private metadata!: NodeForgeEncryptionWorkerMetadata;

    constructor() {
        super();
    }

    public async init(config: HiveWorker): Promise<void> {
        await AwaitHelper.execute<void>(super.init(config));
        this.metadata = this.checkObjectStructure<NodeForgeEncryptionWorkerMetadata>(
            NodeForgeEncryptionWorkerMetadata,
            config.metadata
        );
    }

    public base64Encode = (toEncode: string): string => {
        const bytes: string = forge.util.encodeUtf8(toEncode);
        const encoded: string = forge.util.encode64(bytes);
        return encoded;
    };

    public base64Decode = (toDecode: string): string => {
        const decodedBytes: string = forge.util.decode64(toDecode);
        const decoded: string = forge.util.decodeUtf8(decodedBytes);
        return decoded;
    };

    public symmetricDecrypt = (message: string): string => {
        // Split message to get iv and data
        let iv: string;
        let data: string | forge.util.ByteStringBuffer | ArrayBuffer | forge.util.ArrayBufferView;
        let decodedKey: string | forge.util.ByteStringBuffer;

        // Validate message format
        if (!message || message.length <= 0 || message.indexOf(":") < 0) {
            throw new Error("Secure message data is not in the correct format");
        }

        const messageParts: any[] | string[] = message.split(":");

        // TODO: Validate error conditions. Decode64 does not throw errors
        try {
            iv = forge.util.decode64(messageParts[0]);
        } catch (e) {
            throw new Error("Secure message symmetric iv not in the correct format");
        }

        // TODO: Validate error conditions. Decode64 does not throw errors
        try {
            data = forge.util.decode64(messageParts[1]);
        } catch (e) {
            throw new Error("Secure message data packet not in the correct format");
        }

        // TODO: Validate error conditions. Decode64 does not throw errors
        try {
            decodedKey = forge.util.decode64(this.metadata.encryptionKey);
        } catch (e) {
            throw new Error("Secure message symmetric key not in the correct format");
        }

        // Create and execute decipher
        const decipher = forge.cipher.createDecipher("AES-CBC", decodedKey);
        decipher.start({ iv });
        decipher.update(forge.util.createBuffer(data));
        decipher.finish();

        // Get decrypted message
        const decrypted = decipher.output.data;
        return decrypted;
    };

    public symmetricEncrypt = (message: string): string => {
        // Get random iv
        const iv = forge.random.getBytesSync(16);
        const encodedIv = forge.util.encode64(iv);

        // Create and execute cipher
        const cipher = forge.cipher.createCipher("AES-CBC", forge.util.decode64(this.metadata.encryptionKey));
        cipher.start({ iv });
        cipher.update(forge.util.createBuffer(message));
        cipher.finish();

        // Build message
        message = encodedIv + ":" + forge.util.encode64(cipher.output.data);
        return message;
    };
}
