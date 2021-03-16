import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { GraphService } from "../../lib/services/GraphService";
import { insertAddress } from "../common/InsertFunctions";
import { updateContact, updateUser, updateAddress } from "../common/UpdateFunctions";
import { UpdateContactArgs, UpdateUserArgs, UpdateAddressArgs } from "../lib/models/updateModels";

export type UpdateContactInfoArgs = {
    contact: { contactId?: number; contactData?: UpdateContactArgs };
    user: { userId?: number; userData?: UpdateUserArgs };
    address: { addressId?: number; householdId: number; addressData?: UpdateAddressArgs };
};

export default class UpdateContactInfo extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (data: UpdateContactInfoArgs) => {
        try {
            GraphService.getSingleton().graphRootUrl = this.config.metadata.mpGraphUrl;

            const res: any = {
                contact: false,
                user: false,
                address: false,
            };

            if (data.contact && data.contact.contactId && data.contact.contactData) {
                const contactRes = await updateContact(data.contact.contactId, data.contact.contactData);
                res.contact = contactRes > 0;
            }

            if (data.user && data.user.userId && data.user.userData) {
                const userRes = await updateUser(data.user.userId, data.user.userData);
                res.user = userRes > 0;
            }

            if (
                "address" in data &&
                "addressData" in data.address &&
                !data.address.addressId &&
                !data.address.householdId
            ) {
                throw new Error("Either addressId or householdId is needed to update address data");
            }

            if (data.address.addressId && data.address.addressData) {
                const addressRes = await updateAddress(data.address.addressId, data.address.addressData);
                res.address = addressRes > 0;
            }

            if (data.address.householdId && !data.address.addressId && data.address.addressData) {
                const addressRes = await insertAddress(data.address.householdId, data.address.addressData);

                res.address = addressRes > 0;
            }

            return res;
        } catch (err) {
            err.message = err.message.replaceAll("Error: ", "");
            throw new Error(err);
        }
    };
}
