import joi from "joi";
import { validateProperties } from "@12stonechurch/omnihive-worker-common/helpers/ArgsHelper";
import { addDataToObject } from "@12stonechurch/omnihive-worker-common/helpers/GenericFunctions";
import { BaseWorkerModel } from "../../../BaseWorkerModel";

export class GetExtendedContactReturn implements BaseWorkerModel {
    constructor(obj?: unknown) {
        if (obj) {
            addDataToObject<GetExtendedContactReturn>(GetExtendedContactReturn, this, obj);
        }
    }

    public userId: number = 0;
    public contactId: number = 0;
    public firstName: string = "";
    public lastName: string = "";
    public nickname: string = "";
    public displayName: string = "";
    public dateOfBirth: string = "";
    public genderId: number = 0;
    public email: string = "";
    public phone: string = "";
    public participantRecord: number = 0;
    public emailUnlisted: boolean = false;
    public mobilePhoneUnlisted: boolean = false;
    public bulkEmailOptOut: boolean = false;
    public bulkTextOptOut: boolean = false;
    public removeFromDirectory: boolean = false;
    public canImpersonate: boolean = false;
    public customApplicationUserSettingsId: number = 0;
    public userSettings: string = "";
    public householdId: number = 0;
    public congregationId: number = 0;
    public congregationName: string = "";
    public addressId: number = 0;
    public addressLine1: string = "";
    public addressLine2: string = "";
    public city: string = "";
    public stateRegion: string = "";
    public postalCode: string = "";
    public photoUrl: string = "";

    // Validation Properties
    public propertySchema: joi.ObjectSchema<any> = joi.object({
        userId: joi.number().integer().positive().required(),
        contactId: joi.number().integer().positive().required(),
        firstName: joi
            .string()
            .pattern(/^[a-zA-Z ]+$/, { name: "alpha characters" })
            .required(),
        lastName: joi
            .string()
            .pattern(/^[a-zA-Z ]+$/, { name: "alpha characters" })
            .required(),
        nickname: joi
            .string()
            .pattern(/^[a-zA-Z ]+$/, { name: "alpha characters" })
            .required(),
        displayName: joi
            .string()
            .pattern(/^[a-zA-Z, ]+$/, { name: "alpha characters" })
            .required(),
        dateOfBirth: joi.date().iso().optional(),
        genderId: joi.number().integer().positive().optional(),
        email: joi.string().email().required(),
        phone: joi
            .string()
            .pattern(/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}$/)
            .optional(),
        participantRecord: joi.number().integer().positive().required(),
        emailUnlisted: joi.boolean().default(false).optional(),
        mobilePhoneUnlisted: joi.boolean().default(false).optional(),
        bulkEmailOptOut: joi.boolean().default(false).optional(),
        bulkTextOptOut: joi.boolean().default(false).optional(),
        removeFromDirectory: joi.boolean().default(false).optional(),
        canImpersonate: joi.boolean().default(false).optional(),
        customApplicationUserSettingsId: joi.number().integer().positive().optional(),
        userSettings: joi.string().optional(),
        householdId: joi.number().integer().positive().optional(),
        congregationId: joi.number().integer().positive().optional(),
        congregationName: joi.string().optional(),
        addressId: joi.number().integer().positive().optional(),
        addressLine1: joi.string().optional(),
        addressLine2: joi.any().optional(),
        city: joi
            .string()
            .pattern(/^[a-zA-Z ]+$/, { name: "alpha characters" })
            .optional(),
        stateRegion: joi
            .string()
            .pattern(/^[a-zA-Z]+$/, { name: "alpha characters" })
            .optional(),
        postalCode: joi
            .string()
            .pattern(/^[0-9]+$/, { name: "numeric characters" })
            .optional(),
        photoUrl: joi.string().uri().optional(),
    });

    public validateProperties = (): GetExtendedContactReturn => {
        try {
            const value = validateProperties<GetExtendedContactReturn>(this, this.propertySchema);

            return value;
        } catch (err: any) {
            throw new Error(`Invalid Property in GetExtendedContactReturn: ${err.message}`);
        }
    };
}
