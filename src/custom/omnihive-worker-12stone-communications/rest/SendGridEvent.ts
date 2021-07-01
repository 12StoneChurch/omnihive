import { IRestEndpointWorker } from "@withonevision/omnihive-core/interfaces/IRestEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import swaggerUi from "swagger-ui-express";
import dayjs from "dayjs";
import { updateCommunicationMessageStatus } from "../common/updateCommunicationMessageStatus";
import { insertCommunicationStat } from "../common/insertCommunicationStat";
import { runGraphQuery, setGraphUrl } from "../lib/services/GraphService";

type StatData = {
    commId: number;
    contactId: number;
    eventTypeId: number;
    sgEventId?: string;
    sgTimestampId?: Date;
};

export default class SupportSearch extends HiveWorkerBase implements IRestEndpointWorker {
    private currentCommMgrMsgId: number = 0;
    private dataUrl = "";

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
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                ApplicationName: {
                                                    type: "string",
                                                },
                                                CommunicationId: {
                                                    type: "number",
                                                },
                                                ContactId: {
                                                    type: "number",
                                                },
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
            this.dataUrl = `${this.serverSettings.config.webRootUrl}/${this.metadata.data.dataSlug}`;
            setGraphUrl(this.dataUrl);

            const orderedBody = body.sort((a: any, b: any) => a.timestamp - b.timestamp);

            for (const item of orderedBody) {
                if (!item.CommunicationId || !item.ContactId) {
                    continue;
                }

                this.currentCommMgrMsgId = await this.validateCommunication(item.CommunicationId);

                const { status, statType } = this.getStatusValues(item);

                if (status > 0) {
                    await this.setStatus(item, status);
                }

                if (statType > 0) {
                    await this.setStatisticData(item, statType);
                }
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
                status = 4;
                statType = 1;
                break;
            case "dropped":
                status = 5;
                statType = 6;
                break;
            case "deferred":
                status = 6;
                statType = 5;
                break;
            case "bounce":
                status = 6;
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
        if (this.currentCommMgrMsgId > 0) {
            const statData: StatData = {
                commId: body.CommunicationId,
                contactId: body.ContactId,
                eventTypeId: statusId,
            };

            const statusText: string = this.getStatusString(statusId, body);

            await updateCommunicationMessageStatus(
                this.dataUrl,
                statData.commId,
                statData.contactId,
                statusId,
                statusText
            );
        }
    };

    private setStatisticData = async (body: any, statTypeId: number) => {
        if (this.currentCommMgrMsgId > 0) {
            const statData: StatData = {
                commId: body.CommunicationId,
                contactId: body.ContactId,
                eventTypeId: statTypeId,
                sgEventId: body.sg_event_id,
                sgTimestampId: dayjs.unix(body.timestamp).toDate(),
            };

            return await insertCommunicationStat(
                this.dataUrl,
                this.currentCommMgrMsgId,
                statData.contactId,
                statData.eventTypeId,
                statData.sgEventId,
                statData.sgTimestampId
            );
        }
    };

    private validateCommunication = async (id: number): Promise<number> => {
        const query: string = `
            query {
                data: communicationManagerMessages(communicationId:"= ${id}") {
                  id: communicationManagerMessageId
                }
            }`;

        const results = await runGraphQuery(query);

        if (results.data?.length > 0) {
            return results.data[0].id;
        }

        return 0;
    };

    private getStatusString = (id: number, body: any): string => {
        if (id === 6) {
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
