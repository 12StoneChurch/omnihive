import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import dayjs from "dayjs";
import { Knex } from "knex";
import { getContactData } from "./getContactData";

export const generateDocument = async (
    docusignWorker: any,
    databaseWorker: IDatabaseWorker,
    mpTemplateId: number,
    webRootUrl: string,
    customSlug: string,
    role: string,
    redirectUrl: string,
    contactId: number
) => {
    const dataResults = await AwaitHelper.execute(
        Promise.all([
            getDocuSignTemplateId(mpTemplateId, databaseWorker),
            getContactData(webRootUrl + customSlug, contactId),
        ])
    );

    const templateId: string = dataResults[0];
    const contactData: any = dataResults[1];
    const email = contactData.email;
    const name = `${contactData.nickname} ${contactData.lastName}`;

    if (docusignWorker) {
        const mpId = await AwaitHelper.execute(createMpEnvelopeData(mpTemplateId, contactData.id, databaseWorker));
        const envelopeData: any = await AwaitHelper.execute(
            docusignWorker.createEnvelope(templateId, email, name, role, mpId)
        );

        await AwaitHelper.execute(storeEnvelopeData(mpId, envelopeData, databaseWorker));

        const url = await AwaitHelper.execute(
            docusignWorker.getEnvelopeUrl(redirectUrl, email, name, envelopeData.envelopeId)
        );

        return { envelopeUrl: url };
    } else {
        throw new Error("DocuSign worker not found.");
    }
};

const getDocuSignTemplateId = async (id: number, databaseWorker: IDatabaseWorker): Promise<string> => {
    if (!databaseWorker) {
        throw new Error("Database worker not configured");
    }

    const queryBuilder: Knex.QueryBuilder = databaseWorker?.connection.queryBuilder();

    queryBuilder.from("DocuSign_Forms as df");
    queryBuilder.where("df.DocuSign_Form_ID", id);
    queryBuilder.select("df.Template_ID as id");

    const results = await AwaitHelper.execute(databaseWorker.executeQuery(queryBuilder.toString()));

    return results[0][0].id;
};

const createMpEnvelopeData = async (
    formId: number,
    contactId: number,
    databaseWorker: IDatabaseWorker
): Promise<number> => {
    if (!databaseWorker) {
        throw new Error("Database worker not configured");
    }

    const insertData: any = {
        Form_ID: formId,
        Contact_ID: contactId,
        Status_ID: 1,
        Domain_ID: 1,
    };

    const queryBuilder: Knex.QueryBuilder = databaseWorker?.connection.queryBuilder();
    queryBuilder.from("DocuSign_Envelopes");
    queryBuilder.insert(insertData, ["DocuSign_Envelope_ID"]);

    return (await AwaitHelper.execute(databaseWorker.executeQuery(queryBuilder.toString())))?.[0]?.[0]
        ?.DocuSign_Envelope_ID;
};

const storeEnvelopeData = async (mpId: number, data: any, databaseWorker: IDatabaseWorker): Promise<any> => {
    if (!databaseWorker) {
        throw new Error("Database worker not configured");
    }

    const dateCreated: string = dayjs(data.statusDateTime).format("YYYY-MM-DD hh:mm:ssa");

    const updateData: any = {
        Envelope_ID: data.envelopeId,
        Status_ID: 2,
        _Last_Updated_Date: dateCreated,
        Domain_ID: 1,
    };

    const queryBuilder: Knex.QueryBuilder = databaseWorker?.connection.queryBuilder();
    queryBuilder.from("DocuSign_Envelopes");
    queryBuilder.update(updateData);
    queryBuilder.where("DocuSign_Envelope_ID", mpId);

    await AwaitHelper.execute(databaseWorker.executeQuery(queryBuilder.toString()));
};
