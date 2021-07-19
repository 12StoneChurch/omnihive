import client from "@sendgrid/client";
import dayjs from "dayjs";
import { serializeError } from "serialize-error";
import { addAuditLogEntry } from "@12stonechurch/omnihive-worker-common/helpers/MpHelper";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { ITaskEndpointWorker } from "@withonevision/omnihive-core/interfaces/ITaskEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";

export default class SendGridUnsubSync extends HiveWorkerBase implements ITaskEndpointWorker {
    private databaseWorker: IDatabaseWorker | undefined;

    private unsubGroups = [
        {
            Name: "Sendgrid Unsubscribe Campus",
            SgId: 133453,
            MpId: 13256, // PROD
            // MpId: 12149, // DEV
        },
        {
            Name: "Sendgrid Unsubscribe Church-Wide",
            SgId: 133454,
            MpId: 13255, // PROD
            // MpId: 12148, // DEV
        },
        {
            Name: "Sendgrid Unsubscribe Parents of Kids and Students",
            SgId: 135247,
            MpId: 13392, // PROD
            // MpId: 13296, // DEV
        },
    ];

    private globalUnsubGroupId = 13254;

    private clientInit = false;

    public execute = async () => {
        this.databaseWorker = this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");

        await this.initSendGridClient();
        if (this.clientInit) {
            await this.updateGlobalUnsubs();
            await this.updateUnsubscribeGroups();
        }
    };

    /**  * Initialize the Send Grid Client  */
    private initSendGridClient = async () => {
        // Get the SendGrid API Key from the configuration settings
        const apiKey = this.metadata.apiKey;

        // If the API Key does not exist then no emails can be sent
        if (!apiKey) {
            throw new Error("SendGrid settings not found");
        }

        // Set the API Key in the SendGrid client
        try {
            client.setApiKey(apiKey);

            // Set the init flag to true
            this.clientInit = true;
        } catch (err) {
            // Something happened force the init flag to false
            this.clientInit = false;
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };

    private updateGlobalUnsubs = async () => {
        const globals = await this.getGlobalUnsubs();
        if (globals && globals.length > 0) {
            await this.setOptOutFlag(globals);
            await this.setCustomField(globals, true);
            await this.addToUnsubGroup(globals);
        }
    };

    private getGlobalUnsubs = async () => {
        let page = 0;
        let unsubEmails = [];
        let request = { method: "GET", url: `/v3/suppression/unsubscribes?limit=500&offset=${page * 500}` };
        let response = await this.getSendGridResponse(request);
        while (response?.[1] && response[1].length > 0) {
            page += 1;
            request = { method: "GET", url: `/v3/suppression/unsubscribes?limit=500&offset=${page * 500}` };
            unsubEmails.push(response[1].map((x: any) => x.email));
            unsubEmails = unsubEmails.flat(Infinity);
            response = await this.getSendGridResponse(request);
        }
        return unsubEmails;
    };

    private setOptOutFlag = async (emailList: any) => {
        if (this.databaseWorker) {
            const chunk = 100;

            for (let i: number = 1; i * chunk < emailList.length; i++) {
                const workingList = emailList.slice((i - 1) * chunk, i * chunk);

                const contactQuery = this.databaseWorker.connection.queryBuilder();

                contactQuery.from("Contacts as c");
                contactQuery.whereRaw(`Email_Address in ('${workingList.join("','")}')`);
                contactQuery.andWhereRaw("c.Bulk_Email_Opt_Out = 0");
                contactQuery.select("c.Contact_ID as contactId");

                const changedIds = (await this.databaseWorker.executeQuery(contactQuery.toString()))[0].map(
                    (x: any) => {
                        return { id: x.contactId, optOut: 0 };
                    }
                );
                if (changedIds && changedIds.length > 0) {
                    const contactMutation = this.databaseWorker.connection.queryBuilder();

                    contactMutation.from("Contacts");
                    contactMutation.update({ Bulk_Email_Opt_Out: 1 });
                    contactMutation.whereRaw(`Contact_ID in (${changedIds.map((x: any) => x.id).join(",")})`);

                    await this.databaseWorker.executeQuery(contactMutation.toString());
                    await this.addOptOutAuditLog(changedIds, true);
                }
            }
        } else {
            throw new Error("Database Worker not found");
        }
    };

    private addOptOutAuditLog = async (idList: any, optOut: any) => {
        if (this.databaseWorker) {
            for (const data of idList) {
                const auditObject = {
                    log: {
                        tableName: "Contacts",
                        recordId: data.id,
                        description: "Updated",
                        username: "***Default Contact",
                        userId: 5690,
                        datetime: new Date(),
                    },
                    detail: {
                        field: { name: "Bulk_Email_Opt_Out", label: "Bulk Email Opt Out" },
                        value: { new: optOut ? "True" : "False", previous: data.optOut ? "True" : "False" },
                    },
                };

                await addAuditLogEntry(auditObject, this.databaseWorker);
            }
        } else {
            throw new Error("Database Worker not found");
        }
    };

    private setCustomField = async (emailList: any, optOut: any) => {
        const users = emailList
            .map((x: any) => {
                if (x) {
                    return { email: x.toLowerCase(), custom_fields: { e3_T: optOut ? "TRUE" : "FALSE" } };
                } else {
                    return undefined;
                }
            })
            .filter((y: any) => y);

        if (users && users.length > 0) {
            const sgChunk = 500;

            for (let i = 0; i < users.length; i += sgChunk) {
                const currentDataList = users.slice(i, i + sgChunk);
                await this.performSendGridUpdate(currentDataList);
            }
        }
    };

    private addToUnsubGroup = async (list: any) => {
        const mpIds = await this.getMpIds(list);

        if (mpIds && mpIds.length > 0) {
            const chunk = 100;

            for (let i = 0; i < mpIds.length; i += chunk) {
                const currentMpList = mpIds.slice(i, i + chunk);

                await Promise.all(
                    currentMpList.map(async (x) => {
                        await this.updateMpUnsubGroup(x, this.globalUnsubGroupId);
                    })
                );
            }
        }
        const groupMpIds = await this.getGroupsMpIds(this.globalUnsubGroupId);
        const removedIds = groupMpIds.filter((x: any) => !mpIds.some((y) => y === x.contactId));

        if (removedIds && removedIds.length > 0) {
            await this.setEndDateUnsub(
                removedIds.map((x: any) => {
                    return { id: x.groupParticipantId, endDate: x.endDate };
                }),
                this.globalUnsubGroupId
            );
            await this.setDbValuesToDefaults(removedIds);
        }
    };

    private setDbValuesToDefaults = async (removedIds: any) => {
        if (this.databaseWorker) {
            const contactMutation = this.databaseWorker.connection.queryBuilder();
            contactMutation.from("Contacts");
            contactMutation.update({ Bulk_Email_Opt_Out: 0 });
            contactMutation.whereRaw(`Contact_ID in (${removedIds.map((x: any) => x.contactId).join(",")})`);
            await this.databaseWorker.executeQuery(contactMutation.toString());
            await this.addOptOutAuditLog(
                removedIds.map((x: any) => {
                    return { id: x.contactId, optOut: x.optOut };
                }),
                false
            );
            await this.setCustomField(
                removedIds.map((x: any) => x.email),
                false
            );
        } else {
            throw new Error("Database Worker not found");
        }
    };

    /**  * Perform the Upsert into the SendGrid list  *  Adds the contact if one does not currently exist in the SendGrid system  *   * @param {*} contactArray   */
    private performSendGridUpdate = async (contactArray: any) => {
        const request = { method: "PUT", url: "/v3/marketing/contacts", body: { contacts: contactArray } };
        return await this.getSendGridResponse(request);
    };

    private updateUnsubscribeGroups = async () => {
        for (const group of this.unsubGroups) {
            const emails = (await this.getGroupMembers(group.SgId))?.[1];
            if (emails && emails.length > 0) {
                const mpIds = await this.getMpIds(emails);
                if (mpIds && mpIds.length > 0) {
                    const chunk = 100;
                    for (let i = 0; i < mpIds.length; i += chunk) {
                        const currentMpList = mpIds.slice(i, i + chunk);
                        await Promise.all(
                            currentMpList.map(async (x) => {
                                await this.updateMpUnsubGroup(x, group.MpId);
                            })
                        );
                    }
                }
                const groupMpIds = await this.getGroupsMpIds(group.MpId);
                const removedIds = groupMpIds.filter((x: any) => !mpIds.some((y) => y === x.contactId));
                if (removedIds && removedIds.length > 0) {
                    await this.setEndDateUnsub(
                        removedIds.map((x: any) => {
                            return { id: x.groupParticipantId, endDate: x.endDate };
                        }),
                        group.MpId
                    );
                }
            }
        }
    };

    private getGroupMembers = async (sgId: number) => {
        const request = { method: "GET", url: `/v3/asm/groups/${sgId}/suppressions` };
        return await this.getSendGridResponse(request);
    };

    /**  * Get existing MP contact Ids if it exists  *   * @param {number} contactId   */
    private getMpIds = async (list: any) => {
        try {
            if (this.databaseWorker) {
                const chunk = 100;
                let final = [];

                for (let i: number = 1; i * chunk < list.length; i++) {
                    const workingList = list.slice((i - 1) * chunk, i * chunk);
                    const contactQuery = this.databaseWorker.connection.queryBuilder();

                    contactQuery.from("Contacts as c");
                    contactQuery.whereRaw(`c.Email_Address in ('${workingList.join("','")}')`);
                    contactQuery.andWhereRaw("c.Email_Address is not null");
                    contactQuery.andWhereRaw("len(c.Email_Address) > 0");
                    contactQuery.distinct("c.Contact_ID as contactId");
                    const mpIdResults = (await this.databaseWorker.executeQuery(contactQuery.toString()))[0];
                    const mpIds = mpIdResults.map((x: any) => x.contactId);
                    let removeIds: any = [];
                    if (mpIds.length > 0) {
                        const dupQuery = this.databaseWorker.connection.queryBuilder();
                        dupQuery.from("Contact_Relationships as cr");
                        dupQuery.whereRaw("cr.Relationship_ID = 36");
                        dupQuery.andWhereRaw(`cr.Contact_ID in (${mpIds.join(",")})`);
                        dupQuery.distinct("cr.Contact_ID as contactId");
                        removeIds = (await this.databaseWorker.executeQuery(dupQuery.toString()))[0].map(
                            (x: any) => x.contactId
                        );
                    }
                    final.push(mpIds.filter((x: any) => !removeIds.some((y: any) => x === y)));
                    final = final.flat();
                }
                return final;
            } else {
                throw new Error("Database Worker not found");
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };

    private updateMpUnsubGroup = async (contactId: number, groupId: number) => {
        if (contactId && contactId > 0 && this.databaseWorker) {
            const contactQuery = this.databaseWorker.connection.queryBuilder();
            contactQuery.from("Contacts as c");
            contactQuery.whereRaw(`c.Contact_ID = ${contactId}`);
            contactQuery.distinct("c.Participant_Record as participantId");
            const mpParticipantResults: any = (await this.databaseWorker.executeQuery(contactQuery.toString()))[0];

            let mpParticipantId = mpParticipantResults[0].participantId;

            if (!mpParticipantId) {
                const participantInsertObj = {
                    Contact_ID: contactId,
                    Notes: "Created by SendGrid Unsubscribe Sync |",
                    Participant_Type_ID: 10,
                    Participant_Start_Date: new Date(),
                    Domain_ID: 1,
                };
                const participantInsert = this.databaseWorker.connection.queryBuilder();
                participantInsert.from("Participants");
                participantInsert.insert(participantInsertObj);
                await this.databaseWorker.executeQuery(participantInsert.toString());
                const participantQuery = this.databaseWorker.connection.queryBuilder();
                participantQuery.from("Participants");
                participantQuery.whereRaw(`Contact_ID = ${contactId}`);
                participantQuery.select("Participant_ID as participantId");
                const participantResult: any = (await this.databaseWorker.executeQuery(participantQuery.toString()))[0];
                mpParticipantId = participantResult[0].participantId;
                await this.addParticipantAuditLog(mpParticipantId);
                const contactUpdateObj = { Participant_Record: mpParticipantId };
                const contactUpdate = this.databaseWorker.connection.queryBuilder();
                contactUpdate.from("Contacts");
                contactUpdate.update(contactUpdateObj);
                contactUpdate.whereRaw(`Contact_ID = ${contactId}`);
                await this.databaseWorker.executeQuery(contactUpdate.toString());
                await this.addContactAuditLog(contactId, mpParticipantId);
            }

            if (mpParticipantId) {
                const groupQuery = this.databaseWorker.connection.queryBuilder();
                groupQuery.from("Group_Participants as gp");
                groupQuery.whereRaw(`gp.Participant_ID = ${mpParticipantId}`);
                groupQuery.andWhereRaw(`gp.Group_ID = ${groupId}`);
                groupQuery.distinct("gp.Group_ID as groupId", "gp.End_Date as endDate");
                const mpGroupResult: any = (await this.databaseWorker.executeQuery(groupQuery.toString()))[0];
                if (
                    mpGroupResult.length <= 0 ||
                    mpGroupResult[0].groupId !== groupId ||
                    (mpGroupResult[0].endDate && dayjs().isAfter(mpGroupResult[0].endDate))
                ) {
                    const insertObject = {
                        Participant_ID: mpParticipantId,
                        Group_ID: groupId,
                        Group_Role_ID: 14,
                        Domain_ID: 1,
                        Start_Date: new Date(),
                        End_Date: null,
                        Employee_Role: 0,
                        Cleared_To_Serve: 0,
                        Notes: "Added by SendGrid Sync",
                        Auto_Promote: 0,
                        Share_With_Group: 0,
                        Email_Opt_Out: 1,
                        Need_Book: 0,
                    };
                    const groupParticipantInsert = this.databaseWorker.connection.queryBuilder();
                    groupParticipantInsert.from("Group_Participants");
                    groupParticipantInsert.insert(insertObject, ["Group_Participant_ID"]);
                    const response: any = (
                        await this.databaseWorker.executeQuery(groupParticipantInsert.toString())
                    )[0];
                    await this.addGroupParticipantAuditLog(response[0].Group_Participant_ID);
                }
            }
        } else {
            throw new Error("Database Worker not found");
        }
    };

    private addParticipantAuditLog = async (id: number) => {
        if (this.databaseWorker) {
            const auditObject = {
                log: {
                    tableName: "Participants",
                    recordId: id,
                    description: "Created",
                    username: "***Default Contact",
                    userId: 5690,
                    datetime: new Date(),
                },
            };
            await addAuditLogEntry(auditObject, this.databaseWorker);
        } else {
            throw new Error("Database Worker not found");
        }
    };

    private addContactAuditLog = async (id: number, participantId: number) => {
        if (this.databaseWorker) {
            const auditObject = {
                log: {
                    tableName: "Contacts",
                    recordId: id,
                    description: "Updated",
                    username: "***Default Contact",
                    userId: 5690,
                    datetime: new Date(),
                },
                detail: {
                    field: { name: "Participant_Record", label: "Participant Record" },
                    value: { new: participantId, previous: "" },
                },
            };
            await addAuditLogEntry(auditObject, this.databaseWorker);
        } else {
            throw new Error("Database Worker not found");
        }
    };

    private addGroupParticipantAuditLog = async (id: number) => {
        if (this.databaseWorker) {
            const auditObject = {
                log: {
                    tableName: "Group_Participants",
                    recordId: id,
                    description: "Created",
                    username: "***Default Contact",
                    userId: 5690,
                    datetime: new Date(),
                },
            };
            await addAuditLogEntry(auditObject, this.databaseWorker);
        } else {
            throw new Error("Database Worker not found");
        }
    };

    private getGroupsMpIds = async (groupId: number) => {
        if (this.databaseWorker) {
            const contactQuery = this.databaseWorker.connection.queryBuilder();
            contactQuery.from("Contacts as c");
            contactQuery.innerJoin("Group_Participants as gp", "gp.Participant_ID", "c.Participant_Record");
            contactQuery.whereRaw(`gp.Group_ID = ${groupId}`);
            contactQuery.select(
                "c.Contact_ID as contactId",
                "c.Bulk_Email_Opt_Out as optOut",
                "gp.End_Date as endDate",
                "gp.Group_Participant_ID as groupParticipantId",
                "c.Email_Address as email"
            );
            return (await this.databaseWorker.executeQuery(contactQuery.toString()))[0];
        } else {
            throw new Error("Database Worker not found");
        }
    };

    private setEndDateUnsub = async (groupParticipantIds: any, groupId: any) => {
        if (this.databaseWorker) {
            const endDate = new Date();
            const contactMutation = this.databaseWorker.connection.queryBuilder();
            contactMutation.from("Group_Participants");
            contactMutation.update({ End_Date: endDate });
            contactMutation.whereRaw(
                `Group_Participant_ID in (${groupParticipantIds.map((x: any) => x.id).join(",")})`
            );
            contactMutation.andWhereRaw(`Group_ID = ${groupId}`);
            await this.databaseWorker.executeQuery(contactMutation.toString());
            await this.addEndDateAuditLog(groupParticipantIds, endDate);
        } else {
            throw new Error("Database Worker not found");
        }
    };

    private addEndDateAuditLog = async (idList: any, newValue: any) => {
        if (this.databaseWorker) {
            for (const data of idList) {
                const auditObject = {
                    log: {
                        tableName: "Group_Participants",
                        recordId: data.id,
                        description: "Updated",
                        username: "***Default Contact",
                        userId: 5690,
                        datetime: new Date(),
                    },
                    detail: {
                        field: { name: "End_Date", label: "End Date" },
                        value: { new: dayjs(newValue).format("MM/DD/YYYY HH:mm:ss"), previous: data.endDate },
                    },
                };
                await addAuditLogEntry(auditObject, this.databaseWorker);
            }
        } else {
            throw new Error("Database Worker not found");
        }
    };

    private getSendGridResponse = async (request: any): Promise<any> => {
        try {
            return await client.request(request);
        } catch (err) {
            if (err.code === 408) {
                await this.waitForSendGrid(29);
                return await this.getSendGridResponse(request);
            } else if (err.code === 429 && err.response && err.response.headers) {
                await this.waitForSendGrid(err.response.headers["x-ratelimit-reset"]);
                return await this.getSendGridResponse(request);
            } else {
                throw new Error(JSON.stringify(serializeError(err)));
            }
        }
    };

    private waitForSendGrid = async (seconds: number) => {
        console.log(`*** Waiting ${seconds + 1} seconds for SendGrid's API to respond ***`);
        return new Promise((resolve) => setTimeout(resolve, (seconds + 1) * 1000));
    };
}
