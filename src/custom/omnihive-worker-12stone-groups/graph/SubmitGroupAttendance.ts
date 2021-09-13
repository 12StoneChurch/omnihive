import { errorHelper } from "@12stonechurch/omnihive-worker-common/helpers/ErrorHelper";
import { getExecuteContext } from "@12stonechurch/omnihive-worker-common/helpers/ExecuteHelper";
import { DanyService } from "@12stonechurch/omnihive-worker-common/services/DanyService";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import dayjs from "dayjs";
import j from "joi";

import { AttendanceFormId } from "../common/constants";
import { AttendanceRecord } from "../models/AttendanceRecord";
import { addAttendanceEvent } from "../queries/addAttendanceEvent";
import { addEventGroup } from "../queries/addEventGroup";
import { addEventParticipants } from "../queries/addEventParticipants";
import { getAttendanceRecordExists } from "../queries/getAttendanceRecordExists";
import { getContact } from "../queries/getContact";
import { submitAttendanceForm } from "../queries/submitAttendanceForm";

export interface Args {
    contactId: number;
    groupId: number;
    date: string;
    meetingOccurred: boolean;
    participants: number[];
    anonCount: number;
    childCount: number;
    feedback?: string;
}

const argsSchema = j.object({
    contactId: j.number().integer().positive().required(),
    groupId: j.number().integer().positive().required(),
    date: j.string().default(dayjs().toISOString()),
    meetingOccurred: j.bool().default(false),
    participants: j.array().items(j.number().integer().positive()).default([]),
    anonCount: j.number().integer().min(0).default(0),
    childCount: j.number().integer().min(0).default(0),
    feedback: j.string().optional(),
});

export default class SubmitGroupAttendance extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (rawArgs: unknown, context: GraphContext): Promise<AttendanceRecord | Error> => {
        try {
            const { args, knex, customGraph } = await getExecuteContext<Args>({
                worker: this,
                context,
                rawArgs,
                argsSchema,
            });

            // set up form id
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

            return await knex.transaction(async (trx) => {
                // check for existing attendance record
                const exists = await getAttendanceRecordExists(knex, { ...args });

                if (exists) {
                    throw new Error(
                        `An attendance record has already been submitted for date "${dayjs(args.date).format(
                            "YYYY-MM-DD"
                        )}"`
                    );
                }

                // create attendance-type event
                const eventId = await addAttendanceEvent(trx, { ...args });

                // relate event to group
                await addEventGroup(trx, { eventId, ...args });

                // add participants to event
                const participantIds = await addEventParticipants(trx, {
                    eventId,
                    participantIds: args.participants,
                });

                // get submitter contact
                const contact = await getContact(customGraph, { ...args });

                // submit mp form
                DanyService.getSingleton().setMetaData(this.metadata);
                await submitAttendanceForm({ formId, participantIds, contact, ...args });

                return {
                    groupId: args.groupId,
                    eventId,
                    date: dayjs(args.date).toISOString(),
                    participants: participantIds,
                    anonCount: args.anonCount,
                    childCount: args.childCount,
                    feedback: args.feedback,
                };
            });
        } catch (err) {
            return errorHelper(err);
        }
    };
}
