import { IHiveWorker } from "@withonevision/omnihive-core/interfaces/IHiveWorker";

export interface IImageWorker extends IHiveWorker {
    getMpImageUrl(path: string, transformations: any): string;
    search(expression: string, sortBy: {key: string, orderBy: "asc" | "desc"},
        maxResults: number, nextCursor: string, withFields: string, aggregate: string): Promise<any>;
}
