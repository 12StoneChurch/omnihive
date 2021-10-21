import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { IImageWorker } from "@12stonechurch/omnihive-worker-common/interfaces/IImageWorker";

export const getImageUrl = (worker: HiveWorkerBase, uniqueName: string, transformations?: any) => {
    const imageWorker: IImageWorker | undefined = worker.getWorker("image");

    if (imageWorker) {
        const results = imageWorker.getMpImageUrl(uniqueName, transformations);
        return { url: results };
    }

    return "";
};
