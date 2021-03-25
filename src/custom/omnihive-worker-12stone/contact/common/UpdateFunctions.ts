import { getMutationPropsString } from "../../lib/helpers/GenericFunctions";
import { GraphService } from "../../lib/services/GraphService";
import { UpdateContactArgs, UpdateHouseholdArgs, UpdateUserArgs, UpdateAddressArgs } from "../lib/models/UpdateModels";
import { validateAddress, validateContactData, validateUserData } from "./ValidationFunctions";

export async function updateContact(contactId: number, data: UpdateContactArgs) {
    try {
        validateContactData(data);

        const mutationProps = getMutationPropsString(data);

        if (mutationProps.length > 0) {
            const mutation = `
                mutation {
                    data: update_Contact(
                        whereObject: { contactId: "= ${contactId}" }
                        updateObject: {
                            ${mutationProps}
                        }
                    )
                }
            `;

            return (await GraphService.getSingleton().runQuery(mutation)).data;
        } else return;
    } catch (err) {
        throw new Error(err);
    }
}

export async function updateHousehold(householdId: number, data: UpdateHouseholdArgs) {
    if (!("doNotMoveCongregation" in data)) {
        data.doNotMoveCongregation = true;
    }

    const mutationProps = getMutationPropsString(data);

    const mutation = `
      mutation {
        data: update_Household(
          whereObject: { householdId: "= ${householdId}" }
          updateObject: { ${mutationProps} }
        )
      }
      `;

    return (await GraphService.getSingleton().runQuery(mutation)).data;
}

export async function updateUser(userId: number, data: UpdateUserArgs) {
    try {
        if (data.userEmail) {
            data.userEmail = data.userEmail.toLowerCase();
        }

        await validateUserData(userId, data);

        const mutation = `
          mutation {
            data: update_DpUser(
              whereObject: { userId: "= ${userId}" }
              updateObject: { 
                userName: "${data.userEmail}"
                userEmail: "${data.userEmail}"
              }
            )
          }
        `;

        return (await GraphService.getSingleton().runQuery(mutation)).data;
    } catch (err) {
        throw new Error(err);
    }
}

export async function updateAddress(addressId: number, data: UpdateAddressArgs) {
    try {
        validateAddress(data);

        const mutationProps = getMutationPropsString(data);

        if (mutationProps.length > 0) {
            const mutation = `
        mutation {
          data: update_Address(
            whereObject: { addressId: "= ${addressId}" }
            updateObject: { ${mutationProps} }
          )
        }
        `;

            return (await GraphService.getSingleton().runQuery(mutation)).data;
        } else return;
    } catch (err) {
        throw new Error(err);
    }
}
