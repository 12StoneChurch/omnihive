import { OmniHiveClient } from "@withonevision/omnihive-client";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { ITaskEndpointWorker } from "@withonevision/omnihive-core/interfaces/ITaskEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import chalk from "chalk";
import dayjs from "dayjs";
import { serializeError } from "serialize-error";
import ElasticWorker from "@12stonechurch/omnihive-worker-elastic";

export default class CmsSearchImporter extends HiveWorkerBase implements ITaskEndpointWorker {
    private graphUrl = "";
    private processedIds: string[] = [];
    private elasticWorker: ElasticWorker | undefined;
    private idList: { [siteId: number]: string[] } = {};

    public execute = async (): Promise<any> => {
        try {
            this.elasticWorker = this.getWorker(HiveWorkerType.Unknown, "ohElastic") as ElasticWorker | undefined;

            if (this.elasticWorker) {
                await AwaitHelper.execute(this.elasticWorker.init(this.elasticWorker.config));

                this.graphUrl = this.config.metadata.mpGraphUrl;

                const documentDataIds: { typeIds: number[]; siteIds: number[] } = await AwaitHelper.execute<{
                    typeIds: number[];
                    siteIds: number[];
                }>(this.getDocumentTypeIds());

                for (const siteId of documentDataIds.siteIds) {
                    const elasticIndex = `cms-${siteId}`;
                    await this.elasticWorker.deleteIndex(elasticIndex);
                    await this.elasticWorker.validateIndex(elasticIndex);
                    await Promise.all(
                        documentDataIds.typeIds.map(async (typeId) => {
                            await this.uploadTypeDocuments(typeId, siteId);
                        })
                    );
                }

                if (this.elasticWorker.client && Object.keys(this.idList).length > 0) {
                    for (const siteId in this.idList) {
                        console.log(
                            chalk.gray(
                                `(${dayjs().format("YYYY-MM-DD HH:mm:ss")}) Removing unused Ids => typeId: ${siteId}`
                            )
                        );

                        await AwaitHelper.execute(
                            this.elasticWorker.removeUnused(`cms-${siteId}`, this.idList[siteId])
                        );

                        console.log(
                            chalk.greenBright(
                                `(${dayjs().format(
                                    "YYYY-MM-DD HH:mm:ss"
                                )}) Completed removing unused Ids => typeId: ${siteId}`
                            )
                        );
                    }
                }
            } else {
                throw new Error("Failed to find an elastic worker");
            }

            return;
        } catch (err) {
            console.log(chalk.redBright(JSON.stringify(serializeError(err))));
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };

    private uploadTypeDocuments = async (typeId: number, siteId: number) => {
        console.log(
            chalk.yellow(
                `(${dayjs().format("YYYY-MM-DD HH:mm:ss")}) Started processing => siteId: ${siteId} typeId: ${typeId}`
            )
        );

        let docList = await AwaitHelper.execute<any>(this.getFullDocuments(siteId, typeId));
        docList = docList?.filter((x: any) => !this.processedIds.some((y: string) => y === x.DocumentId.toString()));

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
                    await AwaitHelper.execute(
                        this.elasticWorker.upsert(`cms-${siteId}`, "DocumentId", elasticIdList, docChunk)
                    );
                }

                elasticIdList.forEach((id: string) => this.processedIds.push(id));
            }
        }

        console.log(
            chalk.greenBright(
                `(${dayjs().format("YYYY-MM-DD HH:mm:ss")}) Completed processing => siteId: ${siteId} typeId: ${typeId}`
            )
        );
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
}
