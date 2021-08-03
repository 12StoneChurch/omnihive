import dayjs from "dayjs";
import { Knex } from "knex";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";

export async function createFormResponse(formId: number, contact: any, databaseWorker: IDatabaseWorker) {
    const insertObject: any = {};

    insertObject["Form_ID"] = formId;
    insertObject["Response_Date"] = dayjs().format("YYYY-MM-DD hh:mm:ssa");
    insertObject["Contact_ID"] = contact.ContactId;
    insertObject["First_Name"] = contact.FirstName;
    insertObject["Last_Name"] = contact.LastName;
    insertObject["Domain_ID"] = 1;

    if ("EmailAddress" in contact) {
        insertObject["Email_Address"] = contact.EmailAddress;
    }

    if ("AddressLine1" in contact) {
        insertObject["Address_Line_1"] = contact.AddressLine1;
    }
    if ("AddressLine2" in contact) {
        insertObject["Address_Line_2"] = contact.AddressLine2;
    }
    if ("AddressCity" in contact) {
        insertObject["Address_City"] = contact.AddressCity;
    }
    if ("AddressLine1" in contact) {
        insertObject["Address_State"] = contact.StateRegion;
    }
    if ("AddressLine1" in contact) {
        insertObject["Address_Zip"] = contact.PostalCode;
    }

    const knex: Knex = databaseWorker.connection;
    const queryBuilder = knex.queryBuilder();

    queryBuilder.from("Form_Responses");
    queryBuilder.insert(insertObject, ["Form_Response_ID"]);

    return (await databaseWorker.executeQuery(queryBuilder.toString()))[0][0].Form_Response_ID;
}
