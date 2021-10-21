import joi from "joi";
import { validateProperties } from "src/custom/omnihive-worker-12stone-common/helpers/ArgsHelper";
import { addDataToObject } from "src/custom/omnihive-worker-12stone-common/helpers/GenericFunctions";
import { BaseWorkerModel } from "../../../BaseWorkerModel";

export class GetExtendedContactArgs implements BaseWorkerModel {
    constructor(obj?: unknown) {
        if (obj) {
            addDataToObject<GetExtendedContactArgs>(GetExtendedContactArgs, this, obj);
        }
    }

    public userId: number = 0;
    public disableUser?: boolean;
    public disableSettings?: boolean;
    public disableHousehold?: boolean;
    public disableCongregation?: boolean;
    public disableAddress?: boolean;
    public disableProfilePicture?: boolean;

    // Validation properties
    public propertySchema: joi.ObjectSchema<any> = joi.object({
        userId: joi.number().integer().positive().required(),
        disableUser: joi.boolean().optional(),
        disableSettings: joi.boolean().optional(),
        disableHouseholds: joi.boolean().optional(),
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
