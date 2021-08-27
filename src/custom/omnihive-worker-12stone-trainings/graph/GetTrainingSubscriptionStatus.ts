import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { Knex } from "knex";
import { serializeError } from "serialize-error";

import { TrainingStatus } from "../lib/enums";

interface Args {
    trainingId: number;
    contactId: number;
}
export default class GetTrainingSubscriptionStatus extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<any> => {
        try {
            /* Verify auth token */
            await verifyToken(_omniHiveContext);

            if (!customArgs?.contactId) {
                throw new Error("GetAllEngagements requires a customArg of engagementId");
            }
            // Get the connection to the database
            const worker = await this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");

            // Set connection as Knex
            const connection = worker?.connection as Knex;

            // PAGE ARGS
            const { contactId, trainingId } = customArgs;

            const data = await getSubscriptionData(connection, contactId, trainingId);

            if (!data[0]) {
                return { status: TrainingStatus.Undefined, statusName: "Undefined" };
            } else if (!data[0].unsubscribed) {
                return { status: TrainingStatus.InProgress, statusName: "In Progress" };
            } else if (data[0].unsubscribed) {
                return { status: TrainingStatus.Unsubscribed, statusName: "Unsubscribed" };
            }
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

const getSubscriptionData = (connection: Knex, contactId: number, trainingId: number) => {
    const query = connection.queryBuilder();

    query
        .select("cp.contact_id", "t.training_id", "t.title", "p.publication_id", "cp.unsubscribed")
        .from("trainings as t")
        .innerJoin("dp_publications as p", "p.publication_id", "t.publication_id")
        .innerJoin("dp_contact_publications as cp", "cp.publication_id", "p.publication_id")
        .where("cp.contact_id", contactId)
        .andWhere("t.training_id", trainingId);

    return query;
};
