import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { ContactModel } from "@12stonechurch/omnihive-worker-contacts/lib/models/ContactModel";

interface ContactGetter {
    (customGraph: GraphService, opts: { contactId: number }): Promise<ContactModel>;
}

export const getContact: ContactGetter = async (customGraph, { contactId }) => {
    const { GetContact: contact } = await customGraph.runQuery(`
	  query{GetContact(customArgs:{contactId:${contactId}})}
	`);

    return contact as ContactModel;
};
