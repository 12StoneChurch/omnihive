import { errorHelper } from "@12stonechurch/omnihive-worker-common/helpers/ErrorHelper";
import { getExecuteContext } from "@12stonechurch/omnihive-worker-common/helpers/ExecuteHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import j from "joi";

import { AttendanceFormId } from "../common/constants";
import { AttendanceRecordDetail } from "../models/AttendanceRecord";
import { GroupMemberSummary } from "../models/GroupMember";
import { getAttendanceRecord } from "../queries/getAttendanceRecord";
import { getEventParticipants } from "../queries/getEventParticipants";

export interface Args {
    eventId: number;
}

const argsSchema = j.object({
    eventId: j.number().integer().positive().required(),
});

export default class GetAttendanceDetail extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (rawArgs: unknown, context: GraphContext): Promise<AttendanceRecordDetail | Error> => {
        try {
            const { args, knex, customGraph } = await getExecuteContext<Args>({
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

            const record: AttendanceRecordDetail = await knex.transaction(async (trx) => {
                const recordSummary = await getAttendanceRecord(trx, { formId, ...args });

                const participants = await getEventParticipants(trx, { ...args });

                const members: GroupMemberSummary[] = await Promise.all(
                    participants.map(async (participant) => {
                        const { photoGuid, ...participantRest } = participant;

                        let photoUrl: string | undefined = undefined;

                        if (photoGuid) {
                            const {
                                GetCdnUrl: { url },
                            } = await customGraph.runQuery(`query{GetCdnUrl(customArgs:{UniqueName:"${photoGuid}"})}`);

                            photoUrl = url;
                        }

                        return { ...participantRest, photoUrl };
                    })
                );

                return {
                    ...recordSummary,
                    members,
                };
            });

            return record;
        } catch (err) {
            return errorHelper(err);
        }
    };
}
