import { OmniHiveClient } from "@withonevision/omnihive-client";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { ITaskEndpointWorker } from "@withonevision/omnihive-core/interfaces/ITaskEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import chalk from "chalk";
import dayjs from "dayjs";
import { serializeError } from "serialize-error";
import ElasticWorker from "@12stonechurch/omnihive-worker-elastic";
import { ITokenWorker } from "@withonevision/omnihive-core/interfaces/ITokenWorker";
import { Listr } from "listr2";

export default class CmsSearchImporter extends HiveWorkerBase implements ITaskEndpointWorker {
    private graphUrl = "";
    private elasticWorker: ElasticWorker | undefined;
    private idList: { [siteId: number]: string[] } = {};

    public execute = async (): Promise<any> => {
        this.elasticWorker = this.getWorker(HiveWorkerType.Unknown, "ohElastic") as ElasticWorker | undefined;
        const tokenWorker = this.getWorker(HiveWorkerType.Token) as ITokenWorker | undefined;

        if (this.elasticWorker && tokenWorker) {
            await OmniHiveClient.getSingleton().init(this.registeredWorkers, this.environmentVariables);
            const accessToken = await tokenWorker.get();
            OmniHiveClient.getSingleton().setAccessToken(accessToken);
            this.graphUrl = this.metadata.mpGraphUrl;

            const documentDataIds: { typeIds: number[]; siteIds: number[] } = await AwaitHelper.execute<{
                typeIds: number[];
                siteIds: number[];
            }>(this.getDocumentTypeIds());

            const taskArgs: { siteId: number; typeIds: number[] }[] = documentDataIds.siteIds.map((id) => ({
                siteId: id,
                typeIds: documentDataIds.typeIds,
            }));

            const tasks = new Listr<{ siteId: number; typeIds: number[] }>(
                [
                    ...taskArgs.map((args) => ({
                        title: `Import SiteId ${args.siteId}`,
                        task: (_ctx: any, task: any): Listr =>
                            task.newListr(
                                args.typeIds.map((typeId: number) => ({
                                    title: `Import Document Type ${typeId}`,
                                    task: async (): Promise<void> => await this.importCmsDocs(args.siteId, typeId),
                                    retry: 5,
                                    options: {
                                        persistentOutput: true,
                                        showTimer: true,
                                        suffixRetries: true,
                                        showSubtasks: true,
                                    },
                                })),
                                { concurrent: true }
                            ),
                        retry: 5,
                        options: {
                            persistentOutput: true,
                            showTimer: true,
                            suffixRetries: true,
                            showSubtasks: true,
                        },
                    })),
                    {
                        title: "Remove Unused Documents",
                        task: (_ctx, task): Listr =>
                            task.newListr(
                                taskArgs.map((arg) => ({
                                    title: `Removeing Unused Documents for Site ${arg.siteId}`,
                                    task: async (): Promise<void> => await this.removeUnusedIds(arg.siteId),
                                    options: {
                                        persistentOutput: true,
                                        showTimer: true,
                                        showSubtasks: true,
                                    },
                                })),
                                {
                                    concurrent: true,
                                }
                            ),
                        options: {
                            persistentOutput: true,
                            showTimer: true,
                        },
                    },
                ],
                { concurrent: false }
            );

            await tasks.run();
        } else {
            throw new Error("Failed to find an elastic worker");
        }
    };

    private importCmsDocs = async (siteId: number, typeId: number): Promise<any> => {
        try {
            if (this.elasticWorker) {
                const elasticIndex = `cms-${siteId}`;
                await this.elasticWorker.validateIndex(elasticIndex);
                await this.uploadTypeDocuments(typeId, siteId);

                return;
            } else {
                throw new Error("Failed to find an elastic worker");
            }
        } catch (err) {
            console.log(chalk.redBright(JSON.stringify(serializeError(err))));
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };

    private uploadTypeDocuments = async (typeId: number, siteId: number) => {
        let docList = await AwaitHelper.execute<any>(this.getFullDocuments(siteId, typeId));

        if (docList && docList.length > 0) {
            docList.forEach((x: any) => {
                if (!this.idList[siteId]) {
                    this.idList[siteId] = [];
                }

                this.idList[siteId].push(x.DocumentId.toString());
            });

            const chunk = 50;
            for (let i = 0; i < docList.length; i += chunk) {
                const docChunk = docList.slice(i, i + chunk);

                const elasticIdList: string[] = [];
                docChunk.forEach((x: any) => {
                    for (const key in x) {
                        if (
                            !x[key] ||
                            key.includes("Video Attribute") ||
                            key.includes("Metadata") ||
                            key.includes("Resources")
                        ) {
                            delete x[key];
                            continue;
                        }

                        if (typeof x[key] === "number") {
                            continue;
                        }

                        if (typeof x[key] === "string") {
                            x[key] = x[key]
                                .replace(/<[^>]*>/g, "")
                                .replace(/"/g, '\\"')
                                .trim();
                            continue;
                        }

                        if (dayjs(x[key]).isValid()) {
                            if (dayjs(x[key]).isAfter("2100-01-01T00:00:00")) {
                                x[key] = "2100-01-01T00:00:00";
                            }
                            if (dayjs(x[key]).isBefore("1900-01-01T00:00:00")) {
                                x[key] = "1900-01-01T00:00:00";
                            }
                            x[key] = dayjs(x[key]).format("YYYY-MM-DDThh:mm:ss");
                            continue;
                        }
                    }

                    elasticIdList.push(x.DocumentId.toString());
                });

                if (this.elasticWorker) {
                    await AwaitHelper.execute(this.elasticWorker.upsert(`cms-${siteId}`, "DocumentId", docChunk));
                }
            }
        }
    };

    private getDocumentTypeIds = async (): Promise<{ typeIds: number[]; siteIds: number[] }> => {
        const query = `
            query {
                data: cmsDocumentTypes {
                    id: documentTypeId
                },
                siteData: cmsSites {
                    id: siteId
                }
            }
        `;

        const results: { data: { id: number }[]; siteData: { id: number }[] } = await AwaitHelper.execute(
            OmniHiveClient.getSingleton().graphClient(this.graphUrl, query)
        );

        const formattedResults: { typeIds: number[]; siteIds: number[] } = {
            typeIds: results.data.map((data: { id: number }) => data.id),
            siteIds: results.siteData.map((data: { id: number }) => data.id),
        };

        return formattedResults;
    };

    private getFullDocuments = async (siteId: number, typeId: number): Promise<any> => {
        const query = `
            query {
                data: storedProcedures {
                    doc: api_12Stone_Custom_Cms_GetDynamicDocumentsByTypeId(SiteId: ${siteId}, DocumentTypeId: ${typeId})
                },
            }
        `;

        const results = await OmniHiveClient.getSingleton().graphClient(this.graphUrl, query);

        if (results.data[0].doc[0]) {
            return results.data[0].doc[0];
        } else {
            return undefined;
        }
    };

    private removeUnusedIds = async (siteId: number) => {
        if (this.elasticWorker?.client && Object.keys(this.idList).length > 0 && this.idList[siteId]?.length > 0) {
            await AwaitHelper.execute(
                this.elasticWorker.removeUnused(`cms-${siteId}`, this.idList[siteId], "DocumentId")
            );
        }
    };
}
