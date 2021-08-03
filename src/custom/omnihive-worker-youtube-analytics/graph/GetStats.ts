import { IGraphEndpointWorker } from "src/packages/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "src/packages/omnihive-core/models/HiveWorkerBase";
import { google } from "googleapis";
import fs from "fs";

export default class GetStats extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (_customArgs: any, _environmentVariables: any): Promise<any> => {
        const auth = new google.auth.GoogleAuth({
            scopes: [
                "https://www.googleapis.com/auth/yt-analytics-monetary.readonly",
                "https://www.googleapis.com/auth/yt-analytics.readonly",
            ],
        });

        const stream = fs.createReadStream(this.metadata.jsonPath);

        await auth.fromStream(stream);

        const youtubeReport = google.youtubereporting({
            version: "v1",
            auth: auth,
        });

        const results = youtubeReport.jobs.list();

        return results;
    };
}
