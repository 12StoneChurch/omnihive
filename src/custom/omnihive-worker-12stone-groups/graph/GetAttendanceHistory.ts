import { errorHelper } from "@12stonechurch/omnihive-worker-common/helpers/ErrorHelper";
import { getExecuteContext } from "@12stonechurch/omnihive-worker-common/helpers/ExecuteHelper";
import { paginateItems } from "@12stonechurch/omnihive-worker-common/helpers/PaginateHelper";
import { PageModel } from "@12stonechurch/omnihive-worker-common/models/PageModel";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import j from "joi";

import { AttendanceFormId } from "../common/constants";
import { AttendanceRecordSummary } from "../models/AttendanceRecord";
import { countAttendanceRecords } from "../queries/countAttendanceRecords";
import { getAttendanceRecords } from "../queries/getAttendanceRecords";

export interface Args {
    groupId: number;
    page: number;
    perPage: number;
}

const argsSchema = j.object({
    groupId: j.number().integer().positive().required(),
    page: j.number().integer().positive().default(1),
    perPage: j.number().integer().positive().default(20),
});

export default class GetAttendanceHistory extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (
        rawArgs: unknown,
        context: GraphContext
    ): Promise<PageModel<AttendanceRecordSummary> | Error> => {
        try {
            const { args, knex } = await getExecuteContext<Args>({
                worker: this,
                context,
                rawArgs,
                argsSchema,
            });

            let formId: number;

            switch (this.metadata.environment) {
                case "production":
                    formId = AttendanceFormId.PROD;
                    break;
                case "beta":
                    formId = AttendanceFormId.BETA;
                    break;
                case "development":
                    formId = AttendanceFormId.DEV;
                    break;
                default:
                    throw new Error(`Unknown metadata.environment value: ${this.metadata.environment}`);
            }

            const { records, recordsCount } = await knex.transaction(async (trx) => {
                const records = await getAttendanceRecords(trx, { formId, ...args });
                const recordsCount = await countAttendanceRecords(trx, { formId, ...args });

                return { records, recordsCount };
            });

            return paginateItems(records, recordsCount, args.page, args.perPage);
        } catch (err) {
            return errorHelper(err);
        }
    };
}
