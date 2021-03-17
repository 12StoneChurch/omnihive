import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { GraphService } from "../../lib/services/GraphService";
import { insertAddress } from "../common/InsertFunctions";
import { updateContact, updateUser, updateAddress } from "../common/Update-Functions";
import { UpdateContactInfoArgs } from "../lib/models/Update-Models";

export default class UpdateContactInfo extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (data: UpdateContactInfoArgs) => {
        try {
            GraphService.getSingleton().graphRootUrl = this.config.metadata.mpGraphUrl;

            const res: any = {
                contact: undefined,
                user: undefined,
                address: undefined,
            };

            if (data.contact && data.contact.contactId && data.contact.contactData) {
                const contactRes = await updateContact(data.contact.contactId, data.contact.contactData);
                res.contact = contactRes > 0;
            }

            if (data.user && data.user.userId && data.user.userData) {
                const userRes = await updateUser(data.user.userId, data.user.userData);
                res.user = userRes > 0;
            }

            if (data.address?.addressData && !data.address.addressId && !data.address.householdId) {
                throw new Error("Either addressId or householdId is needed to update address data");
            }

            if (data.address?.addressId && data.address?.addressData) {
                const addressRes = await updateAddress(data.address.addressId, data.address.addressData);
                res.address = addressRes > 0;
            }

            if (data.address?.householdId && !data.address?.addressId && data.address?.addressData) {
                const addressRes = await insertAddress(data.address.householdId, data.address.addressData);

                res.address = addressRes > 0;
            }

            return res;
        } catch (err) {
            err.message = err.message.replace(/Error: /g, "");
            throw new Error(err);
        }
    };
}
