export async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getMutationPropsString(props: Record<string, unknown>) {
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
