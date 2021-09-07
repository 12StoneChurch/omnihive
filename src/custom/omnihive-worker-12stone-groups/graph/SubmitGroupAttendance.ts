import { danyPost } from "@12stonechurch/omnihive-worker-common/helpers/DanyHelper";
import { getExecuteContext } from "@12stonechurch/omnihive-worker-common/helpers/ExecuteHelper";
import { DanyService } from "@12stonechurch/omnihive-worker-common/services/DanyService";
import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { ContactModel } from "@12stonechurch/omnihive-worker-contacts/lib/models/ContactModel";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import dayjs from "dayjs";
import j from "joi";
import { Knex } from "knex";
import { serializeError } from "serialize-error";

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
    date: j.string().isoDate().default(dayjs().toISOString()),
    meetingOccurred: j.bool().default(false),
    participants: j.array().items(j.number().integer().positive()).default([]),
    anonCount: j.number().integer().positive().default(0),
    childCount: j.number().integer().positive().default(0),
    feedback: j.string().optional(),
});

export default class SubmitGroupAttendance extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (rawArgs: unknown, context: GraphContext): Promise<any | Error> => {
        try {
            const { args, knex, customGraph } = await getExecuteContext<Args>({
                worker: this,
                context,
                rawArgs,
                argsSchema,
            });

            const formId = 168;
            const eventId = await addAttendanceEvent(knex, { ...args });
            const eventGroupId = await addEventGroup(knex, { eventId, ...args });
            const participantIds = await addEventParticipants(knex, {
                eventId,
                participantIds: args.participants,
            });

            const contact = await getContact(customGraph, { ...args });

            // TODO: abstract danyService into getExecuteContext if possible
            DanyService.getSingleton().setMetaData(this.metadata);

            await submitMpForm({
                formId,
                groupId: args.groupId,
                participantIds,
                contact,
                date: args.date,
                feedback: args.feedback,
                anonCount: args.anonCount,
                childCount: args.childCount,
            });

            return { eventId, eventGroupId, contact };
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

interface AttendanceEventAdder {
    (knex: Knex, opts: { groupId: number; date: string }): Promise<number>;
}

const addAttendanceEvent: AttendanceEventAdder = async (knex, { groupId, date }) => {
    const [eventId] = await knex
        .insert({
            event_title: `Meeting Attendance - Group ${groupId} - ${dayjs(date).format("YYYY-MM-DD")}`,
            event_type_id: 39,
            congregation_id: 1,
            program_id: 1,
            primary_contact: 1,
            event_start_date: date,
            event_end_date: date,
            domain_id: 1,
        })
        .into("events")
        .returning<number[]>("event_id");

    return eventId;
};

interface EventGroupAdder {
    (knex: Knex, opts: { groupId: number; eventId: number }): Promise<number>;
}

const addEventGroup: EventGroupAdder = async (knex, { groupId, eventId }) => {
    const [eventGroupId] = await knex
        .insert({ event_id: eventId, group_id: groupId, domain_id: 1 })
        .into("event_groups")
        .returning<number[]>("event_group_id");

    return eventGroupId;
};

interface EventParticipantsAdder {
    (knex: Knex, opts: { eventId: number; participantIds: number[] }): Promise<number[]>;
}

const addEventParticipants: EventParticipantsAdder = async (knex, { eventId, participantIds }) => {
    if (participantIds.length) {
        const data = participantIds.map((participantId) => ({
            event_id: eventId,
            participant_id: participantId,
            participation_status_id: 3,
            domain_id: 1,
        }));

        const eventParticipantIds = await knex
            .insert(data)
            .into("event_participants")
            .returning<number[]>("participant_id");

        return eventParticipantIds;
    }

    return [];
};

interface ContactGetter {
    (customGraph: GraphService, opts: { contactId: number }): Promise<ContactModel>;
}

const getContact: ContactGetter = async (customGraph, { contactId }) => {
    const { GetContact: contact } = await customGraph.runQuery(`
	  query{GetContact(customArgs:{contactId:${contactId}})}
	`);

    return contact as ContactModel;
};

interface MpFormSubmitter {
    (opts: {
        formId: number;
        groupId: number;
        participantIds: number[];
        contact: ContactModel;
        date: string;
        feedback?: string;
        anonCount: number;
        childCount: number;
    }): Promise<void>;
}

const submitMpForm: MpFormSubmitter = async ({
    formId,
    groupId,
    participantIds,
    contact,
    date,
    feedback,
    anonCount,
    childCount,
}) => {
    await danyPost("/Forms/" + formId + "/Respond", {
        FirstName: contact.nickname,
        LastName: contact.lastName,
        Email: contact.email,
        Phone: contact.phone || "",
        GatheringId: groupId,
        MeetingDate: dayjs(date).format("YYYY-MM-DD"),
        CoachHelp: feedback || "",
        PeopleAttended: participantIds.length + anonCount + childCount,
    });
};
