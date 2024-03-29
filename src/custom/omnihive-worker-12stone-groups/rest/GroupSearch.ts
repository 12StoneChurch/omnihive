import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IRestEndpointWorker } from "@withonevision/omnihive-core/interfaces/IRestEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import ElasticWorker, { ElasticSearchFieldModel } from "@12stonechurch/omnihive-worker-elastic";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { Search } from "../common/Search";
import swaggerUi from "swagger-ui-express";
import queryString from "query-string";

export default class GroupSearch extends HiveWorkerBase implements IRestEndpointWorker {
    public getSwaggerDefinition = (): swaggerUi.JsonObject | undefined => {
        return {
            definitions: {
                PaginatedReturn: {
                    properties: {
                        nextPageNumber: {
                            type: "number",
                        },
                        previousPageNumber: {
                            type: "number",
                        },
                        totalCount: {
                            type: "number",
                        },
                        data: {
                            type: "array",
                            items: {
                                type: "object",
                            },
                        },
                    },
                },
            },
            paths: {
                "/Groups/Search": {
                    get: {
                        description: "Search the Group data",
                        tags: [
                            {
                                name: "Groups",
                            },
                        ],
                        parameters: [
                            {
                                in: "query",
                                name: "query",
                                require: true,
                                schema: {
                                    type: "string",
                                },
                                description: "String to search on",
                            },
                            {
                                in: "query",
                                name: "page",
                                schema: {
                                    type: "number",
                                },
                                description: "Page number",
                                default: 1,
                            },
                            {
                                in: "query",
                                name: "limit",
                                schema: {
                                    type: "number",
                                },
                                description: "Limit on each page",
                                default: 100,
                            },
                        ],
                        responses: {
                            "200": {
                                description: "Search Results",
                                content: {
                                    "application/json": {
                                        schema: {
                                            $ref: "#/definitions/PaginatedReturn",
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

    public execute = async (_headers: any, url: string, _body: any): Promise<any> => {
        try {
            const args = queryString.parse(url.split("?")[1]);
            const query: string = args.query && !Array.isArray(args.query) ? args.query : "";
            const searchFields: ElasticSearchFieldModel[] = this.buildSearchFields();
            const page: number =
                Array.isArray(args.page) || !args.page
                    ? 1
                    : Number.isInteger(Number.parseInt(args.page))
                    ? Number.parseInt(args.page)
                    : 1;
            const limit: number =
                Array.isArray(args.limit) || !args.limit
                    ? 1
                    : Number.isInteger(Number.parseInt(args.limit))
                    ? Number.parseInt(args.limit)
                    : 1;

            if (!query || query.length < 3) {
                throw new Error("The query specified is not of sufficent length.");
            }

            if (searchFields.length <= 0) {
                throw new Error("No search fields to search given.");
            }

            const elasticWorker: ElasticWorker | undefined = this.getWorker(HiveWorkerType.Unknown, "ohElastic") as
                | ElasticWorker
                | undefined;

            if (!elasticWorker) {
                throw new Error("Elastic Worker is not defined.");
            }

            const searchResults: any = await AwaitHelper.execute(
                Search(elasticWorker, query, searchFields, page, limit)
            );

            return { response: searchResults, status: 200 };
        } catch (err) {
            return { response: { error: serializeError(err) }, status: 400 };
        }
    };

    private buildSearchFields = (): ElasticSearchFieldModel[] => {
        return [
            {
                name: "GroupName",
                weight: 0.5,
            },
            {
                name: "Description",
                weight: 0.2,
            },
            {
                name: "GroupMakeup",
                weight: 0.05,
            },
            {
                name: "CampusName",
                weight: 0.25,
            },
            {
                name: "GroupFocus",
                weight: 0.05,
            },
            {
                name: "GroupType",
                weight: 0.05,
            },
            {
                name: "City",
                weight: 0.1,
            },
            {
                name: "ZipCode",
                weight: 0.1,
            },
            {
                name: "Leader1",
                weight: 0.1,
            },
            {
                name: "Leader2",
                weight: 0.1,
            },
            {
                name: "Semester",
                weight: 0.05,
            },
        ];
    };
}
