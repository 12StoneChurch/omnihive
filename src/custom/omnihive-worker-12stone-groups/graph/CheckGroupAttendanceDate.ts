import { getExecuteContext } from "@12stonechurch/omnihive-worker-common/helpers/ExecuteHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import dayjs from "dayjs";
import j from "joi";
import { serializeError } from "serialize-error";

import { getAttendanceRecordsByDate } from "../queries/getAttendanceRecordsByDate";

interface Args {
    groupId: number;
    date: string;
}

const argsSchema = j.object({
    groupId: j.number().integer().positive().required(),
    date: j.string().default(dayjs().toISOString()),
});

export default class CheckGroupAttendanceDate extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (rawArgs: unknown, context: GraphContext): Promise<{ isValid: boolean } | Error> => {
        try {
            const { args, knex } = await getExecuteContext<Args>({ worker: this, context, rawArgs, argsSchema });

            const attendanceRecords = await getAttendanceRecordsByDate(knex, { ...args });

            return { isValid: !attendanceRecords.length };
        } catch (err) {
            if (err instanceof Error) {
                console.log(JSON.stringify(serializeError(err)));
                return err;
            } else {
                console.log("An unknown error occurred.");
                return new Error("An unknown error occurred.");
            }
        }
    };
}
