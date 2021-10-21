import Joi from "joi";

export interface BaseWorkerModel {
    propertySchema: Joi.ObjectSchema<any>;

    validateProperties: () => BaseWorkerModel;
}
