import { getDatabaseObjects } from "@12stonechurch/omnihive-worker-common/helpers/GenericFunctions";
import { getImageUrl } from "@12stonechurch/omnihive-worker-media/common/getImageUrl";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";

export const getContactPhotoUrl = async (worker: HiveWorkerBase, contactId: number) => {
    const { databaseWorker, queryBuilder } = getDatabaseObjects(worker, "dbMinistryPlatform");

    queryBuilder.from("dp_files as f");
    queryBuilder.where("f.record_id", contactId);
    queryBuilder.andWhere("f.page_id", 292);
    queryBuilder.andWhere("f.default_image", 1);
    queryBuilder.select("f.Unique_Name as photoGuid");

    const results = (await databaseWorker.executeQuery(queryBuilder.toString()))[0][0];

    const imageResult = getImageUrl(worker, results.photoGuid);

    if (imageResult) {
        return imageResult.url;
    }

    return "";
};
