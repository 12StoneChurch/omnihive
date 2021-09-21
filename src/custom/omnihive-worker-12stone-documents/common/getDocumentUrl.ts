import { getContactData } from "./getContactData";

/**
 * Get Document Url
 *
 * @param docusignWorker
 * @param webRootUrl
 * @param customSlug
 * @param contactId
 * @param redirectUrl
 * @param envelopeId
 * @returns
 */
export const getDocumentUrl = async (
    docusignWorker: any,
    dataUrl: string,
    contactId: number,
    redirectUrl: string,
    envelopeId: string
) => {
    if (docusignWorker) {
        const contactData: any = await getContactData(dataUrl, contactId);
        const email = contactData.email;
        const name = `${contactData.nickname} ${contactData.lastName}`;

        const url = await docusignWorker.getEnvelopeUrl(redirectUrl, email, name, envelopeId);

        return url;
    }

    return "";
};
