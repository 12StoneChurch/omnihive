import {
    updateContact,
    UpdateContactArgs,
    updateUser,
    updateAddress,
    UpdateAddressArgs,
    UpdateUserArgs,
    insertAddress,
} from "../common/updateFunctions";

export type UpdateContactInfoArgs = {
    contact: { contactId?: number; contactData?: UpdateContactArgs };
    user: { userId?: number; userData?: UpdateUserArgs };
    address: { addressId?: number; householdId: number; addressData?: UpdateAddressArgs };
};

export async function updateContactInfo(data: UpdateContactInfoArgs) {
    const res: any = [];

    if (data.contact.contactId && data.contact.contactData) {
        const contactRes = await updateContact(data.contact.contactId, data.contact.contactData);
        res.push(contactRes);
    }

    if (data.user.userId && data.user.userData) {
        const userRes = await updateUser(data.user.userId, data.user.userData);
        res.push(userRes);
    }

    if (data.address.addressId && data.address.addressData) {
        const addressRes = await updateAddress(data.address.addressId, data.address.addressData);

        res.push(addressRes);
    }

    if (data.address.householdId && !data.address.addressId && data.address.addressData) {
        const addressRes = await insertAddress(data.address.householdId, data.address.addressData);

        res.push(addressRes);
    }

    return res;
}
