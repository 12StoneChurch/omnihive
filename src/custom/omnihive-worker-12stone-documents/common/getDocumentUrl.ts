import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { getDatabaseObjects } from "src/custom/omnihive-worker-12stone-common/helpers/GenericFunctions";
import DocuSignWorker from "src/custom/omnihive-worker-docusign";
import { getContactData } from "./getContactData";

/**
 * Get Document Url
 *
 * @param worker
 * @param contactId
 * @param redirectUrl
 * @param envelopeId
 * @returns
 */
export const getDocumentUrl = async (
    worker: HiveWorkerBase,
    contactId: number,
    redirectUrl: string,
    documentId: number
) => {
    const webRootUrl = worker.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");
    const docusignWorker = worker.getWorker<DocuSignWorker>("unknown", "DocuSignWorker");

    const dataUrl = webRootUrl + worker.metadata.customSlug;

    const baseResults = await Promise.all([getEnvelopeId(worker, documentId), getContactData(dataUrl, contactId)]);

    const envelopeId = baseResults[0];

    if (docusignWorker) {
        const contactData: any = baseResults[1];
        const email = contactData.email;
        const name = `${contactData.nickname} ${contactData.lastName}`;

        if (envelopeId) {
            const url: string | undefined = (await docusignWorker.getEnvelopeUrl(redirectUrl, email, name, envelopeId))
                ?.url;

            return url ?? "";
        }
    }

    return "";
};

const getEnvelopeId = async (worker: HiveWorkerBase, documentId: number) => {
    const { databaseWorker, knex, queryBuilder } = getDatabaseObjects(worker, "dbMinistryPlatform");

    queryBuilder.from("DocuSign_Envelopes as de");
    queryBuilder.where("de.DocuSign_Envelope_ID", knex.raw(documentId));
    queryBuilder.select("de.Envelope_ID as envelopeId");

    return (await AwaitHelper.execute(databaseWorker.executeQuery(queryBuilder.toString())))?.[0]?.[0]?.envelopeId;
};
