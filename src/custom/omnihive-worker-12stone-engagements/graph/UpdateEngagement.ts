/// <reference path="../../../types/globals.omnihive.d.ts" />
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { Knex } from "knex";
import { serializeError } from "serialize-error";

import { getEngagementByIdQuery } from "./../queries/getEngagementById";
import { getTwilioNumber } from "./../queries/getTwilioNumber";
import { getPhoneByContactId } from "../queries/getPhoneByContactId";
import { insertEngagementLogQuery } from "../queries/insertEngagementLog";
import { sendText } from "../queries/sendText";

interface UpdateEngagementWorkerArgs {
    engagementId: number;
    contactId?: number;
    ownerContactId?: number;
    description?: string;
    congregationId?: number;
    engagementTypeId?: number;
    engagementStatusId?: number;
}

export default class UpdateEngagement extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: UpdateEngagementWorkerArgs, _omniHiveContext: GraphContext): Promise<{}> => {
        try {
            // Get the connection to the database
            const worker = await this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");

            // Set connection as Knex
            const connection = worker?.connection as Knex;

            // Use Transaction so that if anything fails, it reverts changes and doesn't create unnecessary data
            const updatedEngagement = await connection.transaction(async (trx) => {
                const existingEngagement = await getEngagementByIdQuery(
                    connection,
                    customArgs.engagementId
                ).transacting(trx);

                // Update engagement
                await updateEngagementQuery(connection, customArgs).transacting(trx);

                // Get updated engagement
                const updatedEngagement = await getEngagementByIdQuery(connection, customArgs.engagementId).transacting(
                    trx
                );

                // Create engagement log for status changes
                if (existingEngagement[0].Engagement_Status_ID !== updatedEngagement[0].Engagement_Status_ID) {
                    const logArgs = {
                        engagementId: customArgs.engagementId,
                        description: `Status changed to ${updatedEngagement[0].Status}`,
                        typeId: 3,
                    };
                    await insertEngagementLogQuery(connection, logArgs).transacting(trx);
                }

                // On owner change create engagement log and send new owner a message
                if (existingEngagement[0].Owner_Contact_ID !== updatedEngagement[0].Owner_Contact_ID) {
                    // Create engagement log
                    const logArgs = {
                        engagementId: customArgs.engagementId,
                        description: `Owner changed to ${updatedEngagement[0].Owner_First_Name} ${updatedEngagement[0].Owner_Last_Name}`,
                        typeId: 4,
                    };

                    const data = await Promise.all([
                        insertEngagementLogQuery(connection, logArgs).transacting(trx),
                        getPhoneByContactId(connection, updatedEngagement[0].Owner_Contact_ID).transacting(trx),
                        getTwilioNumber(connection).transacting(trx),
                    ]);

                    const ownerPhone = data[1][0].Mobile_Phone;
                    const twilioNumber = data[2][0].Default_Number;

                    // Construct custom graph url
                    const graphUrl = this.getEnvironmentVariable("OH_WEB_ROOT_URL") + this.metadata.customUrl;

                    // Send Text to engagement owner about their new engagement
                    const textData = {
                        body: `You've been assigned a new ${updatedEngagement[0].Type} engagement`,
                        from: twilioNumber,
                        to: ownerPhone,
                    };
                    const textSent = await sendText(textData, graphUrl);

                    if (!textSent?.SendSms?.sid) {
                        trx.rollback;
                    }
                }
                return updatedEngagement[0];
            });

            return updatedEngagement;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

const updateEngagementQuery = (connection: Knex, data: UpdateEngagementWorkerArgs) => {
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

// const getTwilioNumber = (connection: Knex) => {
//     const builder = connection.queryBuilder();
//     builder.select("Default_Number").from("Tenant_Twilio_Configurations").where("Twilio_Configuration_ID", 1);
//     return builder;
// };