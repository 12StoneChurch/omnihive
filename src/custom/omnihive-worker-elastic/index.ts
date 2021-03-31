import { Client } from "@elastic/elasticsearch";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IHiveWorker } from "@withonevision/omnihive-core/interfaces/IHiveWorker";
import { HiveWorker } from "@withonevision/omnihive-core/models/HiveWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";

export type ElasticSearchFieldModel = {
    name: string;
    weight: number;
};

export class ElasticWorkerMetadata {
    public cloudId: string = "";
    public username: string = "";
    public password: string = "";
}

export default class ElasticWorker extends HiveWorkerBase {
    public worker?: IHiveWorker;
    public client?: Client;
    private validIndexes?: string[];

    constructor() {
        super();
    }

    public async init(config: HiveWorker) {
        try {
            await AwaitHelper.execute<void>(super.init(config));

            const metadata = this.checkObjectStructure<ElasticWorkerMetadata>(ElasticWorkerMetadata, config.metadata);

            this.client = new Client({
                cloud: {
                    id: metadata.cloudId,
                },
                auth: {
                    username: metadata.username,
                    password: metadata.password,
                },
                maxRetries: 5,
                agent: {
                    keepAlive: true,
                    keepAliveMsecs: 60000,
                },
            });
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    }

    public async search(
        index: string,
        query: string,
        fields?: ElasticSearchFieldModel[],
        page: number = 0,
        limit: number = 100
    ) {
        try {
            const indexExists = await this.validateIndex(index, true);

            if (this.client && indexExists) {
                const results = await this.client?.search({
                    index: index,
                    body: {
                        from: page * limit,
                        size: limit,
                        query: {
                            multi_match: {
                                query: query,
                                fuzziness: "auto",
                                type: "most_fields",
                                fields: fields?.map(
                                    (field: ElasticSearchFieldModel) => `${field.name}^${field.weight}`
                                ),
                            },
                        },
                    },
                });

                return results.body;
            } else if (!indexExists) {
                throw new Error("Index does not exist");
            } else {
                throw new Error("Elastic Client not initialized");
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    }

    public async create(index: string, idFieldName: string, data: any) {
        try {
            if (this.client) {
                const indexExists = await this.validateIndex(index);

                if (indexExists) {
                    await this.client?.index({
                        index: index,
                        id: data[idFieldName].toString(),
                        op_type: "create",
                        refresh: true,
                        body: data,
                    });
                }
            } else {
                throw new Error("Elastic Client not initialized");
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    }

    public async update(index: string, id: string, data: any, upsert?: boolean) {
        try {
            if (this.client) {
                const indexExists = await this.validateIndex(index);

                if (indexExists) {
                    await this.client?.update({
                        index: index,
                        id: id,
                        refresh: true,
                        retry_on_conflict: 5,
                        body: {
                            doc: data,
                            doc_as_upsert: upsert,
                        },
                    });
                }
            } else {
                throw new Error("Elastic Client not initialized");
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    }

    public async bulkUpdate(index: string, idKey: string, data: any[]) {
        try {
            const indexExists = await this.validateIndex(index, true);

            if (this.client && indexExists) {
                this.client.helpers.bulk({
                    datasource: data,
                    refresh: true,
                    onDocument(doc) {
                        return [{ update: { _index: index, _id: doc[idKey] } }, { doc_as_upsert: true }];
                    },
                });
            } else {
                throw new Error("Elastic Client not initialized");
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    }

    public async delete(index: string, id: string) {
        try {
            const indexExists = await this.validateIndex(index, true);

            if (this.client && indexExists) {
                await this.client?.delete({
                    index: index,
                    id: id,
                    refresh: true,
                });
            } else if (!indexExists) {
                return;
            } else {
                throw new Error("Elastic Client not initialized");
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    }

    public async removeUnused(index: string, usedKeys: string[], idKey: string) {
        try {
            const indexExists = await this.validateIndex(index, true);

            if (this.client && indexExists) {
                const unusedKeys = (
                    await this.client.sql.query({
                        body: {
                            query: `Select ${idKey} From \"${index}\" where ${idKey} not in (${usedKeys})`,
                        },
                    })
                ).body.rows;

                if (unusedKeys && unusedKeys.length > 0) {
                    await this.client?.deleteByQuery({
                        index: index,
                        body: {
                            query: {
                                ids: {
                                    values: unusedKeys,
                                },
                            },
                        },
                    });
                }
            } else if (!indexExists) {
                return;
            } else {
                throw new Error("Elastic Client not initialized");
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    }

    public async upsert(index: string, idName: string, data: any[]) {
        try {
            if (this.client) {
                await AwaitHelper.execute(this.bulkUpdate(index, idName, data));
                return;
            } else {
                throw new Error("Elastic Client not initialized");
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    }

    public async validateIndex(index: string, noCreate: boolean = false) {
        try {
            if (this.validIndexes?.find((x) => x === index)) {
                return true;
            }

            if (this.client) {
                const indexExists: boolean = (await this.client.indices.exists({ index: index })).body;

                if (!indexExists && !noCreate) {
                    await this.client?.indices.create({ index: index });
                    this.validIndexes?.push(index);
                    return true;
                }

                if (indexExists) {
                    this.validIndexes?.push(index);
                }

                return indexExists;
            } else {
                throw new Error("Elastic Client not initialized");
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    }

    public async deleteIndex(index: string) {
        try {
            const indexExists = await this.validateIndex(index, true);

            if (this.client && indexExists) {
                await this.client.indices.delete({ index: index });
            } else if (!indexExists) {
                return;
            } else {
                throw new Error("Elastic Client not initialized");
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    }

    public async fixDateMappings(index: string, data: any) {
        try {
            if (this.client) {
                const dateMappings: { [key: string]: { type: string; format: string } } = {};

                for (const key in data) {
                    const mappings = await this.client.indices.getMapping({ index: index });

                    if (
                        data[key] &&
                        typeof data[key] === "string" &&
                        data[key].search(/\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/g) >=
                            0 &&
                        mappings.body[index].mappings.properties[key].format !== "yyyy-MM-dd'T'HH:mm:ss.SSSz"
                    ) {
                        dateMappings[key] = {
                            type: "date",
                            format: "yyyy-MM-dd'T'HH:mm:ss.SSSz",
                        };
                    }
                }

                if (Object.keys(dateMappings).length > 0) {
                    await this.client.indices.putMapping({
                        index: index,
                        body: {
                            properties: dateMappings,
                        },
                    });
                }
            } else {
                throw new Error("Elastic Client not initialized");
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    }

    // private async reconnectClient() {
    //     if (this.client) {
    //         await this.client.close();
    //         await this.init(this.config);
    //     }
    // }
}
