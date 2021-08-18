import axios from "axios";
import { DanyService } from "../services/DanyService";

export const danyPost = async (path: string, body: any, authToken: string = ""): Promise<any> => {
    try {
        const headers: any = {
            "content-type": "application/json",
            "ccc-apikey": DanyService.getSingleton().apiKey,
        };

        if (authToken) {
            headers["authorization"] = authToken;
        }

        return await axios.post(DanyService.getSingleton().rootUrl + path, body, {
            headers: headers,
        });
    } catch (err) {
        console.log(err.response.data.message);
        throw new Error(err.response.data.message);
    }
};

export const danyPut = async (path: string, body: any, authToken: string = ""): Promise<any> => {
    try {
        const headers: any = {
            "content-type": "application/json",
            "ccc-apikey": DanyService.getSingleton().apiKey,
        };

        if (authToken) {
            headers["authorization"] = authToken;
        }

        return await axios.put(DanyService.getSingleton().rootUrl + path, JSON.stringify(body), {
            headers: headers,
        });
    } catch (err) {
        console.log(err.response.data.message);
        throw new Error(err.response.data.message);
    }
};

export const danyGet = async (path: string, authToken: string = ""): Promise<any> => {
    try {
        const headers: any = {
            "content-type": "application/json",
            "ccc-apikey": DanyService.getSingleton().apiKey,
        };

        if (authToken) {
            headers["authorization"] = authToken;
        }

        return await axios.get(DanyService.getSingleton().rootUrl + path, {
            headers: headers,
        });
    } catch (err) {
        console.log(err.response.data.message);
        throw new Error(err.response.data.message);
    }
};

export const danyDelete = async (path: string, authToken: string = ""): Promise<any> => {
    try {
        const headers: any = {
            "content-type": "application/json",
            "ccc-apikey": DanyService.getSingleton().apiKey,
        };

        if (authToken) {
            headers["authorization"] = authToken;
        }

        return await axios.delete(DanyService.getSingleton().rootUrl + path, {
            headers: headers,
        });
    } catch (err) {
        console.log(err.response.data.message);
        throw new Error(err.response.data.message);
    }
};
