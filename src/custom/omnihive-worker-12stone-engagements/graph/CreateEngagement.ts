import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import dayjs from "dayjs";
import { Knex } from "knex";
import { serializeError } from "serialize-error";

import { insertEngagementLogQuery } from "../queries/insertEngagementLog";

interface Args {
    contactId: number;
    ownerContactId?: number;
    description?: string;
    congregationId: number;
    engagementTypeId: number;
    engagementStatusId: number;
}

export default class CreateEngagement extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<{}> => {
        try {
            // Get the connection to the database
            const worker = await this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");

            // Set connection as Knex
            const connection = worker?.connection as Knex;

            // Throw an error if required arguments for a new engagement are not provided
            if (
                !customArgs?.contactId ||
                !customArgs.engagementStatusId ||
                !customArgs?.engagementTypeId ||
                !customArgs.congregationId
            ) {
                throw new Error(
                    "New engagements require arguments for contactId, congregationId, engagementTypeId, and engagementStatusId."
                );
            }

            // Define engagement owner in customArgs if one is not passed in
            if (!customArgs?.ownerContactId) {
                const ownerQuery = defaultOwnerQuery(connection, customArgs);
                const ownerRes = await worker?.executeQuery(ownerQuery.toString());

                if (ownerRes && ownerRes[0].length === 1) {
                    // It returns default owner of the campus when no one is specified for the type
                    customArgs.ownerContactId = ownerRes[0][0].ownerId;
                } else {
                    // It returns the campus AND campus-type default owners.
                    // So it needs to filter for the campus-type owner
                    const owner =
                        ownerRes &&
                        ownerRes[0].find((item) => {
                            return item.engagementTypeId === customArgs.engagementTypeId;
                        });

                    customArgs.ownerContactId = owner.ownerId;
                }
            }

            const engagement = await connection.transaction(async (trx: Knex.Transaction) => {
                // INSERT ENGAGEMENT
                const engagementRes = await insertEngagement(trx, customArgs);
                const engagementData = engagementRes[0];
                console.log(`engagement`, engagementData);

                // CREATE ENGAGEMENT LOG
                const logData = {
                    engagementId: engagementData.Engagement_ID,
                    description: "Engagement created.",
                    typeId: 1, // Created
                };
                await insertEngagementLogQuery(connection, logData).transacting(trx);

                // TODO: SEND NOTIFICATION TO OWNER

                return engagementData;
            });

            return engagement;
        } catch (error) {
            console.log(JSON.stringify(serializeError(error)));
            throw new Error(error);
        }
    };
}

const insertEngagement = async (trx: Knex.Transaction, data: Args) => {
    const { contactId, description, ownerContactId, congregationId, engagementTypeId, engagementStatusId } = data;

    return await trx("Engagements")
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
        .returning("*");
};

const defaultOwnerQuery = (connection: Knex, data: Args) => {
    const query = connection.queryBuilder();

    query
        .select("Contact_ID as ownerId", "Engagement_Type_Id as engagementTypeId")
        .from("Engagement_Default_Owners")
        .where("Congregation_ID", data.congregationId)
        .andWhere(function (q) {
            q.where("Engagement_Type_ID", data.engagementTypeId).orWhere("Engagement_Type_ID", null);
        });

    return query;
};

// const getOwnerData = async (trx: Knex.Transaction, ownerContactId: number) => {
//     return await trx
//         .select("c.First_Name", "c.Nickname", "c.Last_Name", "u.User_ID")
//         .from("Contacts as c")
//         .leftJoin("dp_Users as u", "u.Contact_ID", "c.Contact_ID")
//         .where("c.Contact_ID", ownerContactId);
// };
