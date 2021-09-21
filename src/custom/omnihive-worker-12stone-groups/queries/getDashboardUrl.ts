export enum DashboardUrl {
    DEV = "https://mydev.12stone.church",
    BETA = "https://mybeta.12stone.church",
    PROD = "https://my.12stone.church",
}

export const getDashboardUrl = (ohEnvironment: string | number | boolean | undefined) => {
    if (ohEnvironment) {
        const env = ohEnvironment.toString();

        if (env.includes("omnihivedev")) {
            return DashboardUrl.DEV;
        } else if (env.includes("omnihivebeta")) {
            return DashboardUrl.BETA;
        } else if (env.includes("localhost")) {
            return DashboardUrl.DEV;
        } else {
            return DashboardUrl.PROD;
        }
    } else {
        throw new Error("The OH environment variable isn't recognized.");
    }
};
