import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { ITaskEndpointWorker } from "@withonevision/omnihive-core/interfaces/ITaskEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import chalk from "chalk";
import { serializeError } from "serialize-error";
import ElasticWorker from "@12stonechurch/omnihive-worker-elastic";
import { OmniHiveClient } from "@withonevision/omnihive-client";

export default class EventSearchImporter extends HiveWorkerBase implements ITaskEndpointWorker {
    private graphUrl = "";
    private elasticWorker: ElasticWorker | undefined;

    public execute = async (): Promise<any> => {
        try {
            this.elasticWorker = this.getWorker(HiveWorkerType.Unknown, "ohElastic") as ElasticWorker | undefined;

            if (this.elasticWorker) {
                await AwaitHelper.execute(this.elasticWorker.init(this.elasticWorker.config));

                this.graphUrl = this.serverSettings.config.webRootUrl + "/server1/builder1/ministryplatform";

                const query = `
                    query {
                        data: storedProcedures {
                            rows: service_Custom_12Stone_Event_Search
                          }
                    }
                `;

                const results = (
                    await AwaitHelper.execute(OmniHiveClient.getSingleton().graphClient(this.graphUrl, query))
                ).data[0].rows[0];

                const idKey = "EventId";
                const ids = results.map((x: any) => x[idKey].toString());

                await AwaitHelper.execute(this.elasticWorker.upsert(`events`, idKey, results));
                await AwaitHelper.execute(this.elasticWorker.removeUnused("events", ids, idKey));
            } else {
                throw new Error("Failed to find an elastic worker");
            }

            return;
        } catch (err) {
            console.log(chalk.redBright(JSON.stringify(serializeError(err))));
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };
}
