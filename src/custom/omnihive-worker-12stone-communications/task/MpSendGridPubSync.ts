import client from "@sendgrid/client";
import dayjs from "dayjs";
import _ from "lodash";
import { serializeError } from "serialize-error";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { ITaskEndpointWorker } from "@withonevision/omnihive-core/interfaces/ITaskEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";

export default class MpSendGridPubSync extends HiveWorkerBase implements ITaskEndpointWorker {
    // Globals
    private databaseWorker: IDatabaseWorker | undefined;

    private existingEmails: any = [];
    private newContacts: any = [];
    private errorList: { minor: any; major: any; invalid: any } = { minor: [], major: [], invalid: [] };
    private clientInit = false;

    /**
     * Synchronize the Send Grid Lists with the MP Publications
     */
    public execute = async () => {
        try {
            this.databaseWorker = this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");

            if (this.databaseWorker) {
                // Initialize the Send Grid Client
                await this.initSendGridClient();
                if (this.clientInit) {
                    // Get Publications to be Synced
                    const publications = await this.getPublications();
                    const SGResponseBody: any = (await this.getSendGridLists())?.[0].body;
                    const SGLists = SGResponseBody ? SGResponseBody.result : [];
                    // Iterate through each publication and perform the following steps
                    const chunk = 1;
                    for (let i = 0; i < publications.length; i += chunk) {
                        this.newContacts = [];
                        this.existingEmails = [];
                        const batchedPubs = publications.slice(i, i + chunk);
                        if (batchedPubs && batchedPubs.length > 0) {
                            await Promise.all(
                                batchedPubs.map(async (pub: any) => {
                                    await this.updateSendGridLists(pub, SGLists);
                                })
                            );
                        }
                    }
                    if (this.errorList.major.length > 0 || this.errorList.invalid.length > 0) {
                        await this.sendErrorEmail();
                    }
                } else {
                    throw new Error("Send Grid Client Failed to Init");
                }
            } else {
                throw new Error("Database worker not found");
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };

    /**
     * Initialize the Send Grid Client
     */
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

    /**
     * Get all MP Publications
     */
    private getPublications = async () => {
        if (this.databaseWorker) {
            const publicationQuery = this.databaseWorker.connection.queryBuilder();
            publicationQuery.from("dp_Publications as dp");
            publicationQuery.whereRaw("isNull(dp.Send_Grid_Sync, 0) = 1");
            publicationQuery.select(
                "dp.Publication_ID as id",
                "dp.Title as title",
                "dp.Congregation_ID as campusId",
                "dp._Send_Grid_List_ID as SendGridId",
                "dp._Send_Grid_List_Name as SendGridName",
                "dp.Send_Grid_Sync as SendGridSync"
            );
            try {
                return (await this.databaseWorker.executeQuery(publicationQuery.toString()))[0];
            } catch (err) {
                throw new Error(JSON.stringify(serializeError(err)));
            }
        } else {
            throw new Error("Database worker not found");
        }
    };

    /**
     * Get all Send Grid Lists
     */
    private getSendGridLists = async (): Promise<any> => {
        console.log(`(${dayjs().format("YYYY-MM-DD hh:mm:ss")}) SendGrid Event => Get SendGrid Lists`);
        const request: any = { method: "GET", url: "/v3/marketing/lists?page_size=1000" };
        try {
            return await this.getSendGridResponse(request);
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };

    private updateSendGridLists = async (pub: any, SGLists: any) => {
        // Get users
        await this.getPublicationUsers(pub);
        // Recreate contact list exists in SendGrid
        await this.recreatePublication(pub, SGLists);
        // Update contact list with the publication users
        await this.updateList(pub.users, pub.SendGridId);
        await this.updateNewSgUsers();
    };

    /**
     * Get the given publications users
     *
     * @param {*} publication
     */
    private getPublicationUsers = async (publication: any) => {
        if (this.databaseWorker) {
            const userQuery = this.databaseWorker.connection.queryBuilder();
            userQuery.from("dp_Contact_Publications as dcp");
            userQuery.select(
                "dcp.Contact_Publication_ID as id",
                "dcp.Publication_ID as publicationId",
                "dcp.Contact_ID as contactId",
                "c.Email_Address as email",
                "c.Display_Name as name",
                "dcp.Unsubscribed as unsubscribed",
                "c._SendGrid_ID as sgId"
            );
            userQuery.innerJoin("Contacts as c", "c.Contact_ID", "dcp.Contact_ID");
            userQuery.whereRaw(`dcp.Publication_ID = ${publication.id}`);
            userQuery.andWhereRaw("isNull(dcp.Unsubscribed, 0) = 0");
            userQuery.andWhereRaw("c.Email_Address is not null");
            userQuery.andWhereRaw("isNull(c.Bulk_Email_Opt_Out, 0) = 0");
            try {
                publication.users = (await this.databaseWorker.executeQuery(userQuery.toString()))[0];
                publication.users.forEach((x: any) => (x.email = x.email.toLowerCase()));
            } catch (err) {
                throw new Error(JSON.stringify(serializeError(err)));
            }
        } else {
            throw new Error("Database worker not found");
        }
    };

    /**
     * Recreate the publication has a corresponding Send Grid List
     *
     * @param {*} publication
     */
    private recreatePublication = async (publication: any, SGLists: any): Promise<any> => {
        try {
            console.log(
                `(${dayjs().format("YYYY-MM-DD hh:mm:ss")}) SendGrid Event => Delete List ${publication.title}`
            );
            const currentList = SGLists.find((x: any) => x.id === publication.SendGridId);
            if (currentList) {
                const request: any = {
                    method: "DELETE",
                    url: `/v3/marketing/lists/${currentList.id}?delete_contacts=false`,
                };
                await this.getSendGridResponse(request);
            }
            // If it does not then create it
            return await this.createList(publication);
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };

    /**
     * Create a Send Grid List from the publication
     *
     * @param {*} publication
     */
    private createList = async (publication: any) => {
        const request: any = { method: "POST", url: "/v3/marketing/lists", body: { name: publication.title } };
        let newList = null;
        try {
            console.log(
                `(${dayjs().format("YYYY-MM-DD hh:mm:ss")}) SendGrid Event => Create SendGrid List ${publication.title}`
            );
            const SGResponse = await this.getSendGridResponse(request);
            newList = SGResponse ? SGResponse[0].body : null;
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }

        // If the creation failed return false
        if (!newList) {
            return false;
        }
        // Else it was created, return true
        try {
            await this.updatePublicationData(publication, newList);
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
        return true;
    };

    /**
     * Update the Publication data in MP to hold the Send Grid information
     * @param {*} publication
     * @param {*} newList
     */
    private updatePublicationData = async (publication: any, newList: any) => {
        if (this.databaseWorker) {
            publication.SendGridId = newList.id;
            publication.SendGridName = newList.name;
            const pubMutation = this.databaseWorker.connection.queryBuilder();
            pubMutation.from("dp_Publications");
            pubMutation.whereRaw(`Publication_ID = ${publication.id}`);
            pubMutation.update({ _Send_Grid_List_ID: newList.id, _Send_Grid_List_Name: newList.name }, [
                "Publication_ID",
            ]);
            try {
                await this.databaseWorker.executeQuery(pubMutation.toString());
            } catch (err) {
                throw new Error(JSON.stringify(serializeError(err)));
            }
        } else {
            throw new Error("Database worker not found");
        }
    };

    /**
     * Update the Send Grid List with the publications users
     *
     * @param {*} publication
     */
    private updateList = async (userList: any, listId: any) => {
        const addUsers = userList;
        if (addUsers.length > 0) {
            // Upsert the new contacts to the SendGrid list
            try {
                await this.upsertSendGridContact(addUsers, listId);
            } catch (err) {
                throw new Error(JSON.stringify(serializeError(err)));
            }
        }
    };

    /**
     * Upsert the Contact into the SendGrid list
     *  Adds the contact to SendGrid if they do not exist in the system yet
     *
     * @param {*} users
     * @param {string} listId
     */
    private upsertSendGridContact = async (users: any, listId: any) => {
        this.existingEmails = [];
        this.newContacts = [];
        try {
            await this.verifyUsers(users);
            // Upsert the contacts into the publication list
            if (this.newContacts.length > 0) {
                await this.performSendGridUpsert(this.newContacts, listId);
            }
            if (this.existingEmails.length > 0) {
                await this.performSendGridUpsert(this.existingEmails, listId);
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };

    private verifyUsers = async (users: any) => {
        const chunk = 100;
        try {
            for (let i = 0; i < users.length; i += chunk) {
                const batchedUsers = users.slice(i, i + chunk);
                if (batchedUsers && batchedUsers.length > 0) {
                    await Promise.all(
                        batchedUsers.map(async (user: any) => {
                            if (user.email) {
                                const validEmail = this.validateEmail(user.email);
                                if (validEmail) {
                                    if (!user.sgId && user.sgId <= 0) {
                                        await this.getUserByEmail(user);
                                    } else {
                                        this.existingEmails.push({
                                            email: user.email,
                                            custom_fields: { e6_N: user.contactId },
                                        });
                                    }
                                }
                            }
                        })
                    );
                }
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };

    private getUserByEmail = async (user: any) => {
        if (this.databaseWorker) {
            const contactQuery = this.databaseWorker.connection.queryBuilder();
            contactQuery.from("Contacts as c");
            contactQuery.select("c.Contact_ID as contactId", "c.Email_Address as email", "c.Display_Name as name");
            contactQuery.whereRaw(`c.Email_Address = '${user.email}'`);
            const matchingContacts = (await this.databaseWorker.executeQuery(contactQuery.toString()))[0];
            if (matchingContacts.length > 1 && !this.errorList.major.some((x: any) => x.email === user.email)) {
                this.errorList.major.push(user);
            } else if (
                !(matchingContacts.length <= 0) &&
                !this.errorList.minor.some((x: any) => x.email === user.email)
            ) {
                const newContactObj: any = await this.getNewContactData(matchingContacts[0].contactId);
                newContactObj.email = newContactObj.email.toLowerCase();
                this.newContacts.push(newContactObj);
                this.errorList.minor.push(user);
            }
        } else {
            throw new Error("Database worker not found");
        }
    };

    /**
     * Create the SendGrid Contact Object from MP data
     *
     * @param {number} contactId
     */
    private getNewContactData = async (contactId: number): Promise<any | undefined> => {
        if (contactId && this.databaseWorker) {
            // Get the needed data from MP
            const contactQuery = this.databaseWorker.connection.queryBuilder();
            contactQuery.from("Contacts as c");
            contactQuery.leftJoin("Households as h", "h.Household_ID", "c.Household_ID");
            contactQuery.leftJoin("Addresses as a", "a.Address_ID", "h.Address_ID");
            contactQuery.leftJoin("Congregations as cong", "cong.Congregation_ID", "h.Congregation_ID");
            contactQuery.leftJoin("Contact_Statuses as cs", "cs.Contact_Status_ID", "c.Contact_Status_ID");
            contactQuery.leftJoin("Participants as p", "p.Participant_ID", "c.Participant_Record");
            contactQuery.leftJoin("Participant_Types as pt", "pt.Participant_Type_ID", "p.Participant_Type_ID");
            contactQuery.whereRaw(`c.Contact_ID = ${contactId}`);
            contactQuery.select(
                "c.First_Name as firstName",
                "c.Last_Name as lastName",
                "c.Email_Address as email",
                "c.Mobile_Phone as phoneNumber",
                "c.Contact_ID as contactId",
                "c.Bulk_Email_Opt_Out as bulkEmailOptOut",
                "c.Facebook_Account as facebook",
                "a.Address_Line_1 as addressLine1",
                "a.Address_Line_2 as addressLine2",
                "a.City as city",
                "a.[State/Region] as state",
                "a.Postal_Code as postalCode",
                "a.Country as country",
                "cong.Congregation_Name as campusName",
                "cs.Contact_Status as contactStatus",
                "pt.Participant_Type as participantType"
            );
            const contactResults = (await this.databaseWorker.executeQuery(contactQuery.toString()))[0][0];
            // Restructure the data as needed for SendGrid
            return {
                address_line_1: contactResults.addressLine1,
                address_line_2: contactResults.addressLine2,
                city: contactResults.city,
                country: contactResults.country,
                email: contactResults.email,
                first_name: contactResults.firstName,
                last_name: contactResults.lastName,
                postal_code: contactResults.postalCode,
                state_province_region: contactResults.state,
                custom_fields: {
                    // Current bug in the SendGrid system requires the custom field IDs not the names
                    e3_T: contactResults.bulkEmailOptOut ? "TRUE" : "FALSE",
                    e1_T: contactResults.campusName ?? "None",
                    e5_T: contactResults.contactStatus,
                    e6_N: contactResults.contactId,
                    e4_T: !contactResults.participantType ? 11 : contactResults.participantType,
                },
            };
        } else {
            if (!contactId) {
                throw new Error("Contact Id not given");
            }
            if (!this.databaseWorker) {
                throw new Error("Database worker not found");
            }
        }
    };

    /**
     * Perform the Upsert into the SendGrid list
     *  Adds the contact if one does not currently exist in the SendGrid system
     *
     * @param {*} contactArray
     * @param {string} listId
     */
    private performSendGridUpsert = async (contactArray: any, listId: any) => {
        const protectedContacts: any = [];
        contactArray.map((x: any) => {
            const validEmail = this.validateEmail(x.email);
            if (validEmail) {
                protectedContacts.push(x);
            }
        });
        const chunk = 500;
        for (let i = 0; i < protectedContacts.length; i += chunk) {
            const chunkedContacts = protectedContacts.slice(i, i + chunk);
            await this.putContacts(chunkedContacts, listId);
        }
    };

    private putContacts = async (chunkedContacts: any, listId: any) => {
        console.log(
            `(${dayjs().format("YYYY-MM-DD hh:mm:ss")}) SendGrid Event => Put ${
                chunkedContacts.length
            } Contacts in SendGrid`
        );
        const request = {
            method: "PUT",
            url: "/v3/marketing/contacts",
            body: { list_ids: [listId], contacts: chunkedContacts },
        };
        try {
            await this.getSendGridResponse(request);
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };

    private updateNewSgUsers = async () => {
        const chunk = 50;
        for (let i = 0; i < this.newContacts.length; i += chunk) {
            const batchedUsers = this.newContacts.slice(i, i + chunk);
            await this.updateContactRecord(batchedUsers, chunk);
        }
    };

    private updateContactRecord = async (batchedUsers: any, chunk: any) => {
        try {
            console.log(
                `(${dayjs().format("YYYY-MM-DD hh:mm:ss")}) SendGrid Event => Search ${
                    batchedUsers.length
                } Contacts in SendGrid for Db Update`
            );
            const request: any = {
                method: "POST",
                url: "/v3/marketing/contacts/search",
                body: { query: `email in ('${batchedUsers.map((x: any) => x.email).join("','")}')` },
            };
            const sgUserSet: any = (await this.getSendGridResponse(request))[0];
            for (let i = 0; i < sgUserSet.body.result.length; i += chunk) {
                const userBatch = sgUserSet.body.result.slice(i, i + chunk);
                await Promise.all(
                    userBatch.map(async (sgUser: any) => {
                        await this.saveSgIds(sgUser);
                    })
                );
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };

    private saveSgIds = async (sgUser: any) => {
        if (this.databaseWorker) {
            const contactMutation = this.databaseWorker.connection.queryBuilder();
            contactMutation.from("Contacts");
            contactMutation.whereRaw(`Email_Address = '${sgUser.email}'`);
            contactMutation.update({ _SendGrid_ID: sgUser.id });
            try {
                await this.databaseWorker.executeQuery(contactMutation.toString());
            } catch (err) {
                throw new Error(JSON.stringify(serializeError(err)));
            }
        } else {
            throw new Error("Database worker not found");
        }
    };

    private validateEmail = (email: any) => {
        if (
            email &&
            email.search(
                /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            ) >= 0
        ) {
            return email;
        } else if (email && !this.errorList.invalid.some((x: any) => x === email)) {
            this.errorList.invalid.push(email);
        }
    };

    private sendErrorEmail = async () => {
        // Create the request object
        let request: any = {};
        request.method = "POST";
        request.url = "/v3/mail/send";
        request.body = {
            personalizations: [
                {
                    to: [{ email: "mpsupport@12stone.com", name: "MPSupport" }],

                    // cc: [{

                    //     email: "chris.huff@12stone.com",

                    //     name: "Chris Huff",

                    // }],
                },
            ],
            from: { email: "no-reply@12stone.com", name: "SendGridSyncingTool" },
            subject: "SendGrid Syncing Issue Report",
            content: [{ type: "text/html", value: this.errorEmail() }],
        };
        try {
            console.log(`(${dayjs().format("YYYY-MM-DD hh:mm:ss")}) SendGrid Event => Send SendGrid Email`);
            // Send the email
            await this.getSendGridResponse(request);
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };

    private errorEmail = () => {
        return `     
            <div class="WordSection1">         
                <p class="MsoNormal">             
                    <span style="font-size:12.0pt">                 
                        Data Team,             
                    </span>             
                    <o:p></o:p>         
                </p>         
                <p class="MsoNormal">             
                    <span style="font-size:12.0pt">                 
                        &nbsp;             
                    </span>             
                    <o:p></o:p>         
                </p>         
                <p class="MsoNormal">
                    <span style="font-size:12.0pt">
                        The SENDGRID sync tool has identified the following issues with MP Publications.&nbsp; Please check these exceptions for the next iteration.             
                    </span>             
                    <o:p></o:p>         
                </p>         
                <p class="MsoNormal">             
                    <span style="font-size:12.0pt">                 
                        &nbsp;             
                    </span>             
                    <o:p></o:p>         
                </p>         
                ${
                    this.errorList.major.length > 0
                        ? `         
                <p class="MsoNormal">             
                    <b>                 
                        <u>                     
                            <span style="font-size:12.0pt">                         
                                ERROR:&nbsp; Unmatched Contacts with multiple emails                     
                            </span>                 
                        </u>             
                    </b>             
                    <o:p></o:p>         
                </p>         
                <p class="MsoNormal">             
                    <b>                 
                        <span style="font-size:12.0pt;color:red">                     
                            These Subscribers have not been added to Sendgrid due to multiple contacts having the same email address:                 
                        </span>             
                    </b>             
                    <o:p></o:p>         
                </p>         
                <ul style="margin-top:0in" type="disc">             
                    ${this.errorList.major
                        .map((x: any) => {
                            return `
                                <li class="MsoListParagraph" style="mso-list:l3 level1 lfo3">                        
                                    <span style="font-size:12.0pt">                             
                                        ${x.email}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Contact_ID:${x.contactId}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${x.name} 
                                    </span>
                                    <o:p></o:p>
                                </li>`;
                        })
                        .join("")}         
                </ul>         
                <p class="MsoNormal">             
                    <span style="font-size:12.0pt">                 
                        &nbsp;             
                    </span>             
                    <o:p></o:p>         
                </p>         
                <p class="MsoNormal">             
                    <span style="font-size:12.0pt">                 
                        &nbsp;             
                    </span>             
                    <o:p></o:p>         
                </p>`
                        : ""
                }         ${
            // errorList.minor.length > 0
            false &&
            `         
                <p class="MsoNormal">             
                    <b>                 
                        <u>                     
                            <span style="font-size:12.0pt">                         
                                WARNING: Contacts matched by email ONLY                     
                            </span>                 
                        </u>             
                    </b>             
                    <o:p></o:p>         
                </p>         
                <p class="MsoNormal">             
                    <span style="font-size:12.0pt">                 
                        These Subscribers did not have a matching Contact_ID in SENDGRID, but did have a matching email address.&nbsp; Therefore, their Contact_IDs in SendGrid have been modified with the current Contact_ID of the matching email.             
                    </span>             
                    <o:p></o:p>         
                </p>        
                <ul style="margin-top:0in" type="disc">             
                    ${this.errorList.minor
                        .map((x: any) => {
                            return `
                    <li class="MsoListParagraph" style="mso-list:l3 level1 lfo3">                         
                        <span style="font-size:12.0pt">                             
                            ${x.email}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Contact_ID:${x.contactId}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${x.name}                         
                        </span>                         
                        <o:p></o:p>                     
                    </li>`;
                        })
                        .join("")}         
                </ul>         
                <p class="MsoNormal">             
                    <span style="font-size:12.0pt">                 
                        &nbsp;             
                    </span>                 
                    <o:p></o:p>         
                </p>         
                <p class="MsoNormal">             
                    <span style="font-size:12.0pt">                 
                        &nbsp;             
                    </span>                 
                    <o:p></o:p>         
                </p>`
        }         
            ${
                this.errorList.invalid.length > 0 &&
                `         
                <p class="MsoNormal">             
                    <b>                 
                        <u>                     
                            <span style="font-size:12.0pt">                         
                                WARNING: Invalid Email Addresses in System                     
                            </span>                 
                        </u>             
                    </b>             
                    <o:p></o:p>         
                </p>         
                <p class="MsoNormal">             
                    <span style="font-size:12.0pt">                 
                        These Subscribers did not have valid Email Addresses. Please verify all email addresses have the valid format. Note that some invisible characters such as spaces and tabs are not valid for an email address.             
                    </span>             
                    <o:p></o:p>         
                </p>         
                <ul style="margin-top:0in" type="disc">             
                ${this.errorList.invalid
                    .map((x: any) => {
                        return `
                    <li class="MsoListParagraph" style="mso-list:l3 level1 lfo3">                         
                        <span style="font-size:12.0pt">                             
                            ${x}                         
                        </span>                         
                        <o:p></o:p>                     
                    </li>`;
                    })
                    .join("")}         
                </ul>         
                <p class="MsoNormal">             
                    <span style="font-size:12.0pt">                 
                        &nbsp;             
                    </span>                 
                    <o:p></o:p>         
                </p>         
                <p class="MsoNormal">             
                    <span style="font-size:12.0pt">                 
                        &nbsp;             
                    </span>                 
                    <o:p></o:p>         
                </p>`
            }         
                <p class="MsoNormal">             
                    <b>                 
                        <span style="font-size:12.0pt;color:#333436;border:none windowtext 1.0pt;padding:0in">                     
                            SENT AUTOMATICALLY BY THE SENDGRID SYNC TOOL                 
                        </span>             
                    </b>             
                    <o:p></o:p>         
                </p>         
                <p class="MsoNormal">             
                    &nbsp;             
                    <o:p></o:p>         
                </p>     
            </div> `;
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
