import { Schema, ValidationError } from "joi";

type JoiValidationResult<T> = { value: T; error: never } | { value: never; error: ValidationError };

export const validateArgs = <T>(args: unknown, schema: Schema): T => {
    const { value, error } = schema.validate(args, {
        allowUnknown: true,
        stripUnknown: true,
        convert: true,
    }) as JoiValidationResult<T>;

    if (error) {
        throw new Error(`Invalid customArgs: ${error.message}`);
    }

    args = value;
    return value;
};
