export type UpdateContactInfoArgs = {
    contact?: { contactId?: number; contactData?: UpdateContactArgs };
    user?: { userId?: number; userData?: UpdateUserArgs };
    household?: { householdId: number; householdData: UpdateHouseholdArgs };
    address?: { addressId?: number; householdId: number; addressData?: UpdateAddressArgs };
};

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

export type UpdateHouseholdArgs = {
    congregationId?: number;
    addressId?: number;
    doNotMoveCongregation?: boolean;
};

export type UpdateUserArgs = {
    userEmail?: string;
};

export type UpdateAddressArgs = {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    stateRegion: string;
    postalCode: string;
    foreignCountry?: string;
};
