import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { Knex } from "knex";
import { serializeError } from "serialize-error";

interface TrainingModule {
    trainingModuleId: number;
    title: string;
    slug: string;
    subModules: TrainingSubModule[];
    displayOrder: number;
    progress: number;
    // events: EventData[];
}

interface TrainingSubModule {
    trainingModuleId: number;
    trainingSubmoduleId: number;
    title: string;
    slug: string;
    numberOfPages: number;
    formId: number;
    displayOrder: number;
    trainingUserProgressId: number;
    completed: boolean;
    completionDate: Date | null;
}

// interface EventData {
//     id: number;
//     digital: boolean;
//     eventParticipantId: number;
// };

interface Args {
    trainingId: number;
    userId: number;
}
export default class GetTrainingModules extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<any> => {
        try {
            /* Verify auth token */
            await verifyToken(_omniHiveContext);

            if (!customArgs?.userId || !customArgs?.trainingId) {
                throw new Error("trainingId and userId are required customArgs for GetTrainingModules");
            }
            // Get the connection to the database
            const worker = await this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");

            // Set connection as Knex
            const connection = worker?.connection as Knex;

            // PAGE ARGS
            const { userId, trainingId } = customArgs;

            const trainingModules = await getTrainingModules(connection, trainingId);
            console.log(`trainingModules`, trainingModules);

            if (trainingModules.length <= 0)
                throw Error(`No training modules were found for training id = ${trainingId}`);

            const subModulesWithoutProgress = await getTrainingSubmodules(
                connection,
                trainingModules.map((x) => x.trainingModuleId)
            );
            console.log(`subModulesWithoutProgress`, subModulesWithoutProgress);

            if (subModulesWithoutProgress.length <= 0)
                throw Error(`There was a problem getting submodules for trainingId = ${trainingId}`);

            const progress = await getUserTrainingProgress(
                connection,
                userId,
                subModulesWithoutProgress.map((x) => x.trainingSubmoduleId)
            );
            console.log(`progress`, progress);

            const submodules = buildSubmodulesWithProgress(subModulesWithoutProgress, progress);
            console.log(`submodules`, submodules);
            const final: TrainingModule[] = trainingModules.map((mod) => {
                return {
                    ...mod,
                    progress: calculateProgress(mod.trainingModuleId, submodules),
                    subModules: submodules,
                };
            });
            return final;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

const getTrainingModules = (connection: Knex, trainingId: number) => {
    const query = connection.queryBuilder();

    query
        .select("training_module_id as trainingModuleId", "title", "slug", "display_order as displayOrder")
        .from("training_modules")
        .where({ training_id: trainingId, archived: false });

    return query;
};

const getTrainingSubmodules = (connection: Knex, trainingModuleIds: number[]) => {
    console.log(`trainingModuleIds`, trainingModuleIds);
    const query = connection.queryBuilder();

    query
        .select(
            "training_submodule_id as trainingSubmoduleId",
            "title",
            "slug",
            "display_order as displayOrder",
            "number_of_pages as numberOfPages",
            "form_id as formId",
            "training_module_id as trainingModuleId"
        )
        .from("training_submodules")
        .whereIn("training_module_id", trainingModuleIds)
        .andWhere("archived", false);
    console.log(`query.toSQL()`, query.toSQL());
    return query;
};

const getUserTrainingProgress = (connection: Knex, userId: number, trainingSubmoduleIds: number[]) => {
    const query = connection.queryBuilder();

    query
        .select(
            "training_user_progress_id as trainingUserProgressId",
            "user_id as userId",
            "training_submodule_id as trainingSubmoduleId",
            "completion_date as completionDate"
        )
        .from("training_user_progress")
        .whereIn("training_submodule_id", trainingSubmoduleIds)
        .andWhere("user_id", userId);

    return query;
};

interface SubmodulesWithoutProgress {
    trainingSubmoduleId: number;
    title: string;
    slug: string;
    displayOrder: number;
    numberOfPages: number;
    formId: number;
    trainingModuleId: number;
}
interface Progress {
    trainingUserProgressId: number;
    userId: number;
    trainingSubmoduleId: number;
    completionDate: Date;
}

const buildSubmodulesWithProgress = (submodules: SubmodulesWithoutProgress[], progress: Progress[]) => {
    const submodulesWithProgress: TrainingSubModule[] = submodules.map((submodule) => {
        const moduleProgress = progress.find((x) => x.trainingSubmoduleId === submodule.trainingSubmoduleId);
        const mod: TrainingSubModule = {
            completed: moduleProgress?.completionDate !== undefined,
            trainingUserProgressId: moduleProgress?.trainingUserProgressId ?? 0,
            completionDate: moduleProgress?.completionDate ?? null,
            ...submodule,
        };
        return mod;
    });
    return submodulesWithProgress;
};

const calculateProgress = (trainingModuleId: number, submodules: TrainingSubModule[]) => {
    const numOfSubMods = submodules.filter((mod) => mod.trainingModuleId === trainingModuleId).length;
    const numComplete = submodules.reduce((acc, cur) => {
        if (cur.trainingModuleId === trainingModuleId && cur.completed) {
            acc += 1;
        }
        return acc;
    }, 0);

    const percentDone = Math.round((numComplete / numOfSubMods) * 100);
    return percentDone;
};
