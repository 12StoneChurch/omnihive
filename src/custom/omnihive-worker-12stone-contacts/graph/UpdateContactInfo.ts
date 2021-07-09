import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { insertAddress } from "../common/InsertFunctions";
import { updateContact, updateUser, updateHousehold, updateAddress } from "../common/UpdateFunctions";
import { UpdateContactInfoArgs } from "../lib/models/UpdateModels";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";

export default class UpdateContactInfo extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (data: UpdateContactInfoArgs, _omniHiveContext: GraphContext) => {
        try {
            await GraphService.getSingleton().init(this.registeredWorkers, this.environmentVariables);
            GraphService.getSingleton().graphRootUrl = this.metadata.mpGraphUrl;

            const res: {
                contact: boolean | undefined;
                user: boolean | undefined;
                household: boolean | undefined;
                address: boolean | undefined;
            } = {
                contact: undefined,
                user: undefined,
                household: undefined,
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

            if (data.household && data.household.householdId && data.household.householdData) {
                const householdRes = await updateHousehold(data.household.householdId, data.household.householdData);
                res.household = householdRes > 0;
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
