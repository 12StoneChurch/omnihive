import { IRestEndpointWorker } from "@withonevision/omnihive-core/interfaces/IRestEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import swaggerUi from "swagger-ui-express";
import client from "@sendgrid/client";
import dayjs from "dayjs";
import { updateCommunicationMessageStatus } from "../common/updateCommunicationMessageStatus";
import { insertCommunicationStat } from "../common/insertCommunicationStat";
import { runGraphQuery } from "../lib/services/GraphService";

type StatData = {
    commId: number;
    contactId: number;
    eventTypeId: number;
    sgEventId?: string;
    sgTimestampId?: Date;
};

export default class SupportSearch extends HiveWorkerBase implements IRestEndpointWorker {
    public getSwaggerDefinition = (): swaggerUi.JsonObject | undefined => {
        return {
            paths: {
                "/SendGrid/Event": {
                    post: {
                        description: "Process SendGrid Event",
                        tags: [
                            {
                                name: "SendGrid",
                            },
                        ],
                        requestBody: {
                            name: "event",
                            require: true,
                            description: "SendGrid Event",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            email: {
                                                type: "string",
                                            },
                                            timestamp: {
                                                type: "number",
                                            },
                                            pool: {
                                                type: "object",
                                                properties: {
                                                    name: {
                                                        type: "string",
                                                    },
                                                    id: {
                                                        type: "number",
                                                    },
                                                },
                                            },
                                            "smtp-id": {
                                                type: "string",
                                            },
                                            event: {
                                                type: "string",
                                            },
                                            category: {
                                                type: "string",
                                            },
                                            sg_event_id: {
                                                type: "string",
                                            },
                                            sg_message_id: {
                                                type: "string",
                                            },
                                            reason: {
                                                type: "string",
                                            },
                                            status: {
                                                type: "string",
                                            },
                                            response: {
                                                type: "string",
                                            },
                                            attempt: {
                                                type: "string",
                                            },
                                            type: {
                                                type: "string",
                                            },
                                            useragent: {
                                                type: "string",
                                            },
                                            ip: {
                                                type: "string",
                                            },
                                            url: {
                                                type: "string",
                                            },
                                            asm_group_id: {
                                                type: "number",
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

    public execute = async (_headers: any, _url: string, body: any): Promise<any> => {
        try {
            client.setApiKey(this.config.metadata.sendGridKey);

            const { status, statType } = this.getStatusValues(body);

            if (status > 0) {
                await this.setStatus(body, status);
            }

            if (statType > 0) {
                await this.setStatisticData(body, statType);
            }

            return { status: 200 };
        } catch (err) {
            return { response: { error: serializeError(err) }, status: 400 };
        }
    };

    private getStatusValues = (body: any) => {
        let status: number = 0;
        let statType: number = 0;

        switch (body.event) {
            case "processed":
                status = 1;
                statType = 1;
                break;
            case "delivered":
                status = 2;
                statType = 1;
                break;
            case "dropped":
                status = 8;
                statType = 6;
                break;
            case "deferred":
                status = 8;
                statType = 5;
                break;
            case "bounce":
                status = 8;
                statType = 5;
                break;
            case "open":
                statType = 3;
                break;
            case "click":
                statType = 4;
                break;
            case "spamreport":
                statType = 7;
                break;
            case "unsubscribe":
                statType = 8;
                break;
            case "group_unsubscribe":
                statType = 9;
                break;
            case "group_resubscribe":
                statType = 10;
                break;
        }

        return { status, statType };
    };

    private setStatus = async (body: any, statusId: number) => {
        const dataUrl = `${this.serverSettings.config.webRootUrl}/${this.config.metadata.dataSlug}`;
        const messageIds = await this.getSendGridMessage(body);

        if (await this.validateCommunication(messageIds.commId)) {
            const statData: StatData = {
                ...messageIds,
                eventTypeId: statusId,
            };

            const statusText: string = this.getStatusString(statusId, body);

            await updateCommunicationMessageStatus(dataUrl, statData.commId, statData.contactId, statusId, statusText);
        }
    };

    private setStatisticData = async (body: any, statTypeId: number) => {
        const dataUrl = `${this.serverSettings.config.webRootUrl}/${this.config.metadata.dataSlug}`;

        const messageIds = await this.getSendGridMessage(body);

        if (await this.validateCommunication(messageIds.commId)) {
            const statData: StatData = {
                ...messageIds,
                eventTypeId: statTypeId,
                sgEventId: body.sg_event_id,
                sgTimestampId: dayjs(body.timestamp).toDate(),
            };

            await insertCommunicationStat(
                dataUrl,
                statData.commId,
                statData.contactId,
                statData.eventTypeId,
                statData.sgEventId,
                statData.sgTimestampId
            );
        }
    };

    private validateCommunication = async (id: number): Promise<boolean> => {
        const query: string = `
            query {
                data: dpCommunications(communicationId: "= ${id}") {
                    communicationId
                }
            }`;

        return (await runGraphQuery(query)).data?.length > 0;
    };

    private getSendGridMessage = async (body: any) => {
        const request: any = {
            method: "GET",
            url: `/v3/messages/${body.sg_message_id}`,
        };

        const response = await client.request(request);

        return {
            commId: response?.[1]?.unique_args?.CommunicationId,
            contactId: response?.[1]?.unique_args?.ContactId,
        };
    };

    private getStatusString = (id: number, body: any): string => {
        if (id === 8) {
            switch (body.event) {
                case "dropped":
                    return `Dropped with error ${body.reason}`;
                case "deferred":
                    return `Deferred: Temporarily rejected by the email server`;
                case "bounce":
                    if (body.type === "bounce") {
                        return "Receiving server would not accept mail from this address";
                    }

                    if (body.type === "blocked") {
                        return "Receiving server could not or would not accept the message at this time";
                    }
            }
        }

        return "";
    };
}
