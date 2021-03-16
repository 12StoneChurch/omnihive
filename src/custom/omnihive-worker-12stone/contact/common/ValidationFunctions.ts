import dayjs from "dayjs";
import { GraphService } from "../../lib/services/GraphService";
import { UpdateAddressArgs, UpdateContactArgs, UpdateUserArgs } from "../lib/models/updateModels";

export function validateAddress(data: UpdateAddressArgs) {
    if ("addressLine1" in data && !data.addressLine1) {
        throw new Error("Address line 1 is required");
    }
    if ("city" in data && !data.city) {
        throw new Error("Address City is required");
    }
    if ("stateRegion" in data && !data.stateRegion) {
        throw new Error("Address State Region is required");
    }
    if ("postalCode" in data && !data.postalCode) {
        throw new Error("Address Postal Code is required");
    }
}

export function validateContactData(data: UpdateContactArgs) {
    // Validate Names
    if ("firstName" in data && !data.firstName) {
        throw new Error("Contacts must have a first name");
    }
    if (
        ("firstName" in data && (data.firstName?.includes(" and ") || data.firstName?.includes("&"))) ||
        ("lastName" in data && (data.lastName?.includes(" and ") || data.lastName?.includes("&")))
    ) {
        throw new Error("Contacts must have individual accounts");
    }
    if ("lastName" in data && !data.lastName) {
        throw new Error("Contacts must have a last name");
    }

    // Date of birth checks
    if ("dateOfBirth" in data && dayjs(data.dateOfBirth).isAfter(dayjs())) {
        throw new Error("Date of Birth cannot be greater than the current date");
    }
}

export async function validateUserData(userId: number, data: UpdateUserArgs) {
    if ("userEmail" in data && !data.userEmail) {
        throw new Error("Email is required to update a user");
    }

    const regex = RegExp(
        /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/
    );

    if ("userEmail" in data && data.userEmail && !regex.test(data.userEmail)) {
        throw new Error("Email must be a valid email address");
    }

    if (data.userEmail) {
        const emailInUse: boolean = await emailExists(userId, data.userEmail);

        if (emailInUse) {
            throw new Error("The requested new email is already in use.");
        }
    }
}

export async function emailExists(userId: number, email: string): Promise<boolean> {
    const emailCountQuery = `
      query {
        data: dpUsers_agg(userEmail: "= '${email}'", userId: "!= ${userId}") {
          count(userId: true)
        }
      }
    `;

    const emailCount: number = (await GraphService.getSingleton().runQuery(emailCountQuery)).data[0].count;

    return emailCount > 0;
}
