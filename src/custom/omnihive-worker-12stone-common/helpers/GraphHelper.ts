import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";

export const getCustomGraphConnection = async (worker: HiveWorkerBase) => {
    const webRootUrl = worker.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

    if (!webRootUrl) {
        throw new Error("Error retrieving graph connection: Web Root URL is not defined.");
    }

    const graphService = GraphService.getSingleton();
    graphService.init(worker.registeredWorkers, worker.environmentVariables);
    graphService.graphRootUrl = `${webRootUrl}/server1/custom/graphql`;

    return graphService;
};
