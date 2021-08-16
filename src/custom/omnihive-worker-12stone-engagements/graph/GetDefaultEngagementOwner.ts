import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import type { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import type { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import Joi from "joi";
import type { Knex } from "knex";
import { serializeError } from "serialize-error";

interface Args {
    campusId: number;
    engagementTypeId: number;
}

const argsSchema = Joi.object({
    campusId: Joi.number().integer().positive().required(),
    engagementTypeId: Joi.number().integer().positive().required(),
});

export default class GetDefaultEngagementOwner extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<SelectOwnersResult> => {
        try {
            /* Verify auth token */
            await verifyToken(_omniHiveContext);

            /* Get database connection */
            const worker = this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");
            const connection = worker?.connection as Knex;

            /* Validate and clean custom arguments */
            const { value, error } = argsSchema.validate(customArgs);

            if (error) {
                throw new Error(`Invalid customArgs: ${error.message}`);
            } else {
                customArgs = value;
            }

            /* select alerts */
            const query = selectOwnersBuilder(connection, customArgs);
            const res = await worker?.executeQuery(query.toString());
            const data: SelectOwnersDTO[] = res ? res[0] : [];

            const withType = data.find((dto) => dto.engagement_type_id === customArgs.engagementTypeId);

            if (withType) {
                return {
                    campusId: withType.campus_id,
                    engagementTypeId: withType.engagement_type_id ?? undefined,
                    contactId: withType.contact_id,
                };
            }

            return {
                campusId: data[0].campus_id,
                engagementTypeId: data[0].engagement_type_id ?? undefined,
                contactId: data[0].contact_id,
            };
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

interface SelectOwnersResult {
    campusId: number;
    engagementTypeId?: number;
    contactId: number;
}

interface SelectOwnersDTO {
    engagement_default_owner_id: number;
    campus_id: number;
    engagement_type_id: number | null;
    contact_id: number;
}

const selectOwnersBuilder = (connection: Knex, data: Args) => {
    const builder = connection.queryBuilder();

    builder
        .select([
            "edo.engagement_default_owner_id as engagement_default_owner_id",
            "edo.congregation_id as campus_id",
            "edo.contact_id as contact_id",
            "edo.engagement_type_id as engagement_type_id",
        ])
        .from({ edo: "engagement_default_owners" })
        .where({ "edo.congregation_id": data.campusId });

    return builder;
};
