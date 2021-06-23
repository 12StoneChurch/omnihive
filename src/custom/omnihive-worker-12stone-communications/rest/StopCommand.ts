import { IRestEndpointWorker } from "@withonevision/omnihive-core/interfaces/IRestEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import swaggerUi from "swagger-ui-express";
import { init, runCustomSql, setGraphUrl } from "../lib/services/GraphService";

export default class StopCommand extends HiveWorkerBase implements IRestEndpointWorker {
    public getSwaggerDefinition = (): swaggerUi.JsonObject | undefined => {
        return {
            paths: {
                "/Twilio/StopCommand": {
                    post: {
                        description: "Process Stop Command sent from Twilio",
                        tags: [
                            {
                                name: "Twilio",
                            },
                        ],
                        requestBody: {
                            name: "command",
                            require: true,
                            description: "Twilio Number",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            phoneNumber: {
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

    public execute = async (_headers: any, _url: string, body: any): Promise<any> => {
        try {
            const phoneNumber = this.sanitizeArg(body.phoneNumber);
            const response = await this.updateDb(phoneNumber);
            const jsonResponse = { response };
            return { status: 200, response: JSON.stringify(jsonResponse) };
        } catch (err) {
            return { status: 500, response: { error: serializeError(err) } };
        }
    };

    private sanitizeArg = (phoneNumber: string) => {
        let numOnly = phoneNumber.replace(/[^0-9]/g, "");

        if (numOnly[0] === "1") {
            numOnly = numOnly.slice(1);
        } else if (numOnly[0] === "+") {
            numOnly = numOnly.slice(2);
        }

        const phone = `${numOnly.slice(0, 3)}-${numOnly.slice(3, 6)}-${numOnly.slice(6, 10)}`;

        return phone;
    };

    private updateDb = async (phoneNumber: string) => {
        try {
            await init(this.registeredWorkers);
            setGraphUrl(`${this.serverSettings.config.webRootUrl}/${this.config.metadata.data.dataSlug}`);

            const mutation = `
                update c
                set Bulk_Text_Opt_Out = 1
                from Contacts as c
                    left join Households as h
                        on h.Household_ID = c.Household_ID
                where h.Home_Phone = '${phoneNumber}'
                    or c.Mobile_Phone = '${phoneNumber}'
                    or c.Company_Phone = '${phoneNumber}'
                    or c.Pager_Phone = '${phoneNumber}'
                    or c.Fax_Phone = '${phoneNumber}'
            `;

            const result = await runCustomSql(mutation);

            if (result.update <= 0) {
                throw new Error("Number not found");
            }

            return `Bulk opt-out set for phone number '${phoneNumber}'`;
        } catch (err) {
            throw new Error(err);
        }
    };
}
