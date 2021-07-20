import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import dayjs from "dayjs";
import { Knex } from "knex";
import { serializeError } from "serialize-error";

interface UpsertEngagementWorkerArgs {
    engagementId?: number; // Required for update
    contactId?: number; // Required for create
    ownerContactId?: number; // Required for create
    description?: string;
    congregationId?: number;
    engagementTypeId?: number; // Required for create
    engagementStatusId?: number; // Required for create
}

export default class UpsertEngagement extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: UpsertEngagementWorkerArgs, _omniHiveContext: GraphContext): Promise<{}> => {
        try {
            // Get the connection to the database
            const worker = await this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");

            // Set connection as Knex
            const connection = worker?.connection as Knex;

            // Check if engagement is new
            if (
                customArgs.engagementId === 0 ||
                customArgs.engagementId === null ||
                customArgs.engagementId === undefined
            ) {
                // Throw an error if required arguments for a new engagement are not provided
                if (
                    !customArgs?.contactId ||
                    !customArgs?.ownerContactId ||
                    !customArgs.engagementStatusId ||
                    !customArgs?.engagementTypeId
                ) {
                    throw new Error(
                        "New engagements require arguments for contactId, ownerContactId, engagementTypeId, and engagementStatusId"
                    );
                }

                // INSERT NEW ENGAGEMENT
                const insertQuery = insertEngagementQuery(connection, customArgs);
                const res = await worker?.executeQuery(insertQuery.toString());
                const engagement = res && res[0][0];
                return engagement;
            } else {
                // INSERT NEW ENGAGEMENT
                const updateQuery = updateEngagementQuery(connection, customArgs);
                const res = await worker?.executeQuery(updateQuery.toString());
                const engagement = res && res[0][0];
                return engagement;
            }
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

const insertEngagementQuery = (connection: Knex, data: UpsertEngagementWorkerArgs) => {
    const { contactId, ownerContactId, description, congregationId, engagementTypeId, engagementStatusId } = data;

    const builder = connection.queryBuilder();
    builder
        .insert({
            Contact_ID: contactId,
            Owner_Contact_ID: ownerContactId,
            Description: description,
            Congregation_ID: congregationId,
            Engagement_Type_ID: engagementTypeId,
            Engagement_Status_ID: engagementStatusId,
            Date_Created: dayjs().toISOString(),
            Domain_ID: 1,
        })
        .into("Engagements")
        .returning("*");

    return builder;
};

const updateEngagementQuery = (connection: Knex, data: UpsertEngagementWorkerArgs) => {
    if (!data?.engagementId) {
        throw new Error("Updating engagements requires an engagementId");
    }

    // Build object with updated data
    const updateObject: any = {};

    if (data.contactId) {
        updateObject.Contact_ID = data.contactId;
    }
    if (data.ownerContactId) {
        updateObject.Owner_Contact_ID = data.ownerContactId;
    }
    if (data.description) {
        updateObject.Description = data.description;
    }
    if (data.congregationId) {
        updateObject.Congregation_ID = data.congregationId;
    }
    if (data.engagementTypeId) {
        updateObject.Engagement_Type_ID = data.engagementTypeId;
    }
    if (data.engagementStatusId) {
        updateObject.Engagement_Status_ID = data.engagementStatusId;
    }

    const builder = connection.queryBuilder();

    builder.from("Engagements").update(updateObject).where("Engagement_ID", data.engagementId).returning("*");

    return builder;
};
