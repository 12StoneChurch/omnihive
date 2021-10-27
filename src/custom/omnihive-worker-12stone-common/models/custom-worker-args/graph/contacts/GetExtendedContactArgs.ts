import joi from "joi";
import { validateProperties } from "@12stonechurch/omnihive-worker-common/helpers/ArgsHelper";
import { addDataToObject } from "@12stonechurch/omnihive-worker-common/helpers/GenericFunctions";
import { BaseWorkerModel } from "../../../BaseWorkerModel";

export class GetExtendedContactArgs implements BaseWorkerModel {
    constructor(obj?: unknown) {
        if (obj) {
            addDataToObject<GetExtendedContactArgs>(GetExtendedContactArgs, this, obj);
        }
    }

    public userId: number = 0;
    public disableUser: boolean = false;
    public disableSettings: boolean = false;
    public disableHousehold: boolean = false;
    public disableCongregation: boolean = false;
    public disableAddress: boolean = false;
    public disableProfilePicture: boolean = false;

    // Validation properties
    public propertySchema: joi.ObjectSchema<any> = joi.object({
        userId: joi.number().integer().positive().required(),
        disableUser: joi.boolean().optional(),
        disableSettings: joi.boolean().optional(),
        disableHousehold: joi.boolean().optional(),
        disableCongregation: joi.boolean().optional(),
        disableAddress: joi.boolean().optional(),
        disableProfilePicture: joi.boolean().optional(),
    });

    public validateProperties = () => {
        try {
            const value = validateProperties<GetExtendedContactArgs>(this, this.propertySchema);

            return value;
        } catch (err: any) {
            throw new Error(`Invalid Property in GetExtendedContactReturn: ${err.message}`);
        }
    };
}
