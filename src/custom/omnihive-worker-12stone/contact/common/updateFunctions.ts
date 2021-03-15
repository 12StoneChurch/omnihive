import dayjs from "dayjs";
import { GraphService } from "../../lib/services/GraphService";

export type UpdateContactArgs = {
    firstName?: string;
    lastName?: string;
    nickname?: string;
    mobilePhone?: string;
    dateOfBirth?: string;
    genderId?: number;
    maritalStatusId?: number;
    bulkEmailOptOut?: boolean;
    bulkTextOptOut?: boolean;
};

export async function updateContact(contactId: number, data: UpdateContactArgs) {
    try {
        validateContactData(data);

        const mutationProps = _getMutationPropsString(data);

        if (mutationProps.length > 0) {
            const mutation = `
      mutation {
        update_Contact(
          whereObject: { contactId: "= ${contactId}" }
          updateObject: {
            ${mutationProps}
          }
          )
        }
        `;

            return await GraphService.getSingleton().runQuery(mutation);
        } else return;
    } catch (err) {
        throw new Error(err);
    }
}

export type UpdateHouseholdArgs = {
    congregationId?: number;
    addressId?: number;
    doNotMoveCongregation?: boolean;
};

export async function updateHousehold(householdId: number, data: UpdateHouseholdArgs) {
    if (data.doNotMoveCongregation === undefined) {
        data.doNotMoveCongregation = true;
    }

    const mutation = `
      mutation {
        update_Household(
          whereObject: { householdId: "= ${householdId}" }
          updateObject: { congregationId: ${data.congregationId} }
        )
      }
      `;

    return await GraphService.getSingleton().runQuery(mutation);
}

export type UpdateUserArgs = {
    userEmail?: string;
};

export async function updateUser(userId: number, data: UpdateUserArgs) {
    try {
        validateUserData(data);

        const mutation = `
          mutation {
            update_DpUser(
              whereObject: { userId: "= ${userId}" }
              updateObject: { 
                userName: "${data.userEmail}"
                userEmail: "${data.userEmail}"
              }
            )
          }
        `;

        return await GraphService.getSingleton().runQuery(mutation);
    } catch (err) {
        throw new Error(err);
    }
}

export type UpdateAddressArgs = {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    stateRegion: string;
    postalCode: string;
    foreignCountry?: string;
};

export async function updateAddress(addressId: number, data: UpdateAddressArgs) {
    try {
        validateAddress(data);

        const mutationProps = _getMutationPropsString(data);

        if (mutationProps.length > 0) {
            const mutation = `
        mutation {
          update_Address(
            whereObject: { addressId: "= ${addressId}" }
            updateObject: { ${mutationProps} }
          )
        }
        `;

            return await GraphService.getSingleton().runQuery(mutation);
        } else return;
    } catch (err) {
        throw new Error(err);
    }
}

export async function insertAddress(householdId: number, data: UpdateAddressArgs) {
    try {
        validateAddress(data);

        const mutationProps = _getMutationPropsString(data);

        if (mutationProps.length > 0) {
            const mutation = `
        mutation {
          data: insert_Addresses(
            addresses: [{
              ${mutationProps}
            }]
          ) {
            addressId
          }
        }
        `;

            const addressResults = (await GraphService.getSingleton().runQuery(mutation)).data;
            const returnCount = addressResults.length;
            const addressId: number = addressResults[0].addressId;

            if (addressId) {
                const householdData: UpdateHouseholdArgs = {
                    addressId: addressId,
                };

                await updateHousehold(householdId, householdData);
            }

            return returnCount;
        }
    } catch (err) {
        throw new Error(err);
    }
}

function validateAddress(data: UpdateAddressArgs) {
    if (!data.addressLine1) {
        throw new Error("Address line 1 is required");
    }
    if (!data.city) {
        throw new Error("Address City is required");
    }
    if (!data.stateRegion) {
        throw new Error("Address State Region is required");
    }
    if (!data.postalCode) {
        throw new Error("Address Postal Code is required");
    }
}

function validateContactData(data: UpdateContactArgs) {
    // Validate Names
    if (!data.firstName) {
        throw new Error("Contacts must have a first name");
    }
    if (
        data.firstName?.includes(" and ") ||
        data.firstName?.includes("&") ||
        data.lastName?.includes(" and ") ||
        data.lastName?.includes("&")
    ) {
        throw new Error("Contacts must have individual accounts");
    }
    if (!data.lastName) {
        throw new Error("Contacts must have a last name");
    }

    // Date of birth checks
    if (dayjs(data.dateOfBirth).isAfter(dayjs())) {
        throw new Error("Date of Birth cannot be greater than the current date");
    }
}

async function validateUserData(data: UpdateUserArgs) {
    if (!data.userEmail) {
        throw new Error("Email is required to update a user");
    }

    const regex = RegExp(
        /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/
    );

    if (regex.test(data.userEmail)) {
        throw new Error("Email must be a valid email address");
    }

    const emailInUse: boolean = await emailExists(data.userEmail);

    if (emailInUse) {
        throw new Error("The requested new email is already in use.");
    }
}

async function emailExists(email: string): Promise<boolean> {
    const emailCountQuery = `
      query {
        data: dpUsers_agg(userEmail: "= '${email}'") {
          count(userId: true)
        }
      }
    `;

    const emailCount: number = (await GraphService.getSingleton().runQuery(emailCountQuery)).data[0];

    return emailCount > 0;
}

function _getMutationPropsString(props: Record<string, unknown>) {
    let mutationString = ``;

    for (const prop in props) {
        if (props[prop] !== null || props[prop] !== undefined) {
            if (typeof props[prop] === "string") {
                mutationString += `${prop}: "${props[prop]}"\n`;
            } else if (typeof props[prop] === "number" || typeof props[prop] === "boolean") {
                mutationString += `${prop}: ${props[prop]}\n`;
            }
        }
    }

    return mutationString;
}
