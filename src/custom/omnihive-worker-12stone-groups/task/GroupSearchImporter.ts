import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { ITaskEndpointWorker } from "@withonevision/omnihive-core/interfaces/ITaskEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import chalk from "chalk";
import { serializeError } from "serialize-error";
import ElasticWorker from "@12stonechurch/omnihive-worker-elastic";
import { OmniHiveClient } from "@withonevision/omnihive-client";
import { ITokenWorker } from "@withonevision/omnihive-core/interfaces/ITokenWorker";
import dayjs from "dayjs";

export default class GroupSearchImporter extends HiveWorkerBase implements ITaskEndpointWorker {
    private graphUrl = "";
    private elasticWorker: ElasticWorker | undefined;

    public execute = async (): Promise<any> => {
        try {
            this.elasticWorker = this.getWorker(HiveWorkerType.Unknown, "ohElastic") as ElasticWorker | undefined;
            const tokenWorker = this.getWorker(HiveWorkerType.Token) as ITokenWorker | undefined;

            if (this.elasticWorker && tokenWorker) {
                const accessToken = await tokenWorker.get();
                OmniHiveClient.getSingleton().setAccessToken(accessToken);

                await AwaitHelper.execute(this.elasticWorker.init(this.elasticWorker.config));

                this.graphUrl = this.serverSettings.config.webRootUrl + "/server1/builder1/ministryplatform";

                const query = `
                    query {
                        data: storedProcedures {
                            rows: service_Custom_12Stone_Group_Search
                          }
                    }
                `;

                const results = (
                    await AwaitHelper.execute(OmniHiveClient.getSingleton().graphClient(this.graphUrl, query))
                ).data[0].rows[0];

                const idKey = "GroupId";
                const ids = results.map((x: any) => x[idKey].toString());

                console.log(chalk.yellow(`(${dayjs().format("YYYY-MM-DD HH:mm:ss")}) Group upsert started`));
                await AwaitHelper.execute(this.elasticWorker.upsert(`groups`, idKey, results));
                console.log(chalk.greenBright(`(${dayjs().format("YYYY-MM-DD HH:mm:ss")}) Group upsert complete`));

                console.log(chalk.yellow(`(${dayjs().format("YYYY-MM-DD HH:mm:ss")}) Removing unused keys`));
                await AwaitHelper.execute(this.elasticWorker.removeUnused("groups", ids, idKey));
                console.log(chalk.greenBright(`(${dayjs().format("YYYY-MM-DD HH:mm:ss")}) Unused keys removed`));

                console.log(chalk.greenBright(`(${dayjs().format("YYYY-MM-DD HH:mm:ss")}) Group import complete`));
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
