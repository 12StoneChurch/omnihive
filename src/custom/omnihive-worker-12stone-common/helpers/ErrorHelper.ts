import { serializeError } from "serialize-error";

export const errorHelper = (err: unknown) => {
    console.error(JSON.stringify(serializeError(err)));

    let finalError: Error;

    if (err instanceof Error) {
        finalError = new Error(err.message);
        finalError.name = err.name;
        finalError.stack = err.stack;
    } else {
        finalError = new Error("An unknown error occurred.");
    }

    return finalError;
};
