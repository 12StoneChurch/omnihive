import { IHiveWorker } from "@withonevision/omnihive-core/interfaces/IHiveWorker";

export interface IImageWorker extends IHiveWorker {
    getMpImageUrl(path: string, transformations: any): string;
}
