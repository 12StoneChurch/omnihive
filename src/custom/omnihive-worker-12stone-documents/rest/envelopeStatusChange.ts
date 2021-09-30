import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { IRestEndpointWorker } from "@withonevision/omnihive-core/interfaces/IRestEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { RestEndpointExecuteResponse } from "@withonevision/omnihive-core/models/RestEndpointExecuteResponse";
import dayjs from "dayjs";
import { getDatabaseObjects } from "@12stonechurch/omnihive-worker-common/helpers/GenericFunctions";

export default class EnvelopeStatusChange extends HiveWorkerBase implements IRestEndpointWorker {
    public getSwaggerDefinition = (): any => {
        return {
            paths: {
                "/DocuSign/Event": {
                    post: {
                        description: "Process DocuSign Event",
                        tags: [
                            {
                                name: "DocuSign",
                            },
                        ],
                        requestBody: {
                            name: "event",
                            require: true,
                            description: "DocuSign Event",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            status: {
                                                type: "string",
                                            },
                                            documentsUri: {
                                                type: "string",
                                            },
                                            recipientsUri: {
                                                type: "string",
                                            },
                                            attachmentsUri: {
                                                type: "string",
                                            },
                                            envelopeUri: {
                                                type: "string",
                                            },
                                            emailSubject: {
                                                type: "string",
                                            },
                                            emailBlurb: {
                                                type: "string",
                                            },
                                            envelopeId: {
                                                type: "string",
                                            },
                                            signingLocation: {
                                                type: "string",
                                            },
                                            customFieldsUri: {
                                                type: "string",
                                            },
                                            notificationUri: {
                                                type: "string",
                                            },
                                            enableWetSign: {
                                                type: "string",
                                            },
                                            allowMarkup: {
                                                type: "string",
                                            },
                                            allowReassign: {
                                                type: "string",
                                            },
                                            createdDateTime: {
                                                type: "string",
                                            },
                                            lastModifiedDateTime: {
                                                type: "string",
                                            },
                                            deliveredDateTime: {
                                                type: "string",
                                            },
                                            initialSentDateTime: {
                                                type: "string",
                                            },
                                            sentDateTime: {
                                                type: "string",
                                            },
                                            completedDateTime: {
                                                type: "string",
                                            },
                                            statusChangedDateTime: {
                                                type: "string",
                                            },
                                            documentsCombinedUri: {
                                                type: "string",
                                            },
                                            certificateUri: {
                                                type: "string",
                                            },
                                            templatesUri: {
                                                type: "string",
                                            },
                                            expireEnabled: {
                                                type: "string",
                                            },
                                            expireDateTime: {
                                                type: "string",
                                            },
                                            expireAfter: {
                                                type: "string",
                                            },
                                            sender: {
                                                type: "object",
                                                properties: {
                                                    userName: {
                                                        type: "string",
                                                    },
                                                    userId: {
                                                        type: "string",
                                                    },
                                                    accountId: {
                                                        type: "string",
                                                    },
                                                    email: {
                                                        type: "string",
                                                    },
                                                },
                                            },
                                            purgeState: {
                                                type: "string",
                                            },
                                            envelopeIdStamping: {
                                                type: "string",
                                            },
                                            is21CFRPart11: {
                                                type: "string",
                                            },
                                            signerCanSignOnMobile: {
                                                type: "string",
                                            },
                                            hasFormDataChanged: {
                                                type: "string",
                                            },
                                            allowComments: {
                                                type: "string",
                                            },
                                            hasComments: {
                                                type: "string",
                                            },
                                            allowViewHistory: {
                                                type: "string",
                                            },
                                            envelopeMetadata: {
                                                type: "object",
                                                properties: {
                                                    allowAdvancedCorrect: {
                                                        type: "string",
                                                    },
                                                    enableSignWithNotary: {
                                                        type: "string",
                                                    },
                                                    allowCorrect: {
                                                        type: "string",
                                                    },
                                                },
                                            },
                                            anySigner: {
                                                type: "string",
                                            },
                                            envelopeLocation: {
                                                type: "string",
                                            },
                                            isDynamicEnvelope: {
                                                type: "string",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        responses: {
                            "200": {
                                description: "OK",
                            },
                        },
                    },
                },
            },
        };
    };

    public execute = async (_headers: any, _url: string, body: any): Promise<RestEndpointExecuteResponse> => {
        const response = new RestEndpointExecuteResponse();

        const { databaseWorker, queryBuilder } = getDatabaseObjects(this, "dbMinistryPlatform");

        const dbStatuses = await this.getStatusId(databaseWorker, body.status);
        const statusId =
            dbStatuses.length > 1 ? dbStatuses.find((x) => x.status === body.status)?.id : dbStatuses[0].id;

        if (statusId && statusId > 0) {
            const updateObject: any = {
                Status_ID: statusId,
                _Last_Updated_Date: dayjs(body.lastModifiedDateTime).format("YYYY-MM-DD hh:mm:ss a"),
            };

            if (body.completedDateTime) {
                updateObject["Completion_Date"] = dayjs(body.completedDateTime).format("YYYY-MM-DD hh:mm:ss a");
            }

            queryBuilder.from("DocuSign_Envelopes");
            queryBuilder.where("Envelope_ID", body.envelopeId);
            queryBuilder.update(updateObject);

            try {
                await databaseWorker.executeQuery(queryBuilder.toString());
            } catch (err) {
                response.status = 400;
                response.response = "Envelope Id not found";

                return response;
            }

            response.status = 200;
            return response;
        }

        return {
            status: 400,
            response: "Status Id not found",
        };
    };

    private getStatusId = async (databaseWorker: IDatabaseWorker, status: string) => {
        const queryBuilder = databaseWorker.connection.queryBuilder();

        queryBuilder.from("DocuSign_Envelope_Statuses as des");
        queryBuilder.select("des.DocuSign_Envelope_Status_ID as id", "des.Status as status");
        queryBuilder.where("des.Status", status);

        return (await databaseWorker.executeQuery(queryBuilder.toString()))?.[0];
    };
}
