import { danyPost } from "@12stonechurch/omnihive-worker-common/helpers/DanyHelper";
import { ContactModel } from "@12stonechurch/omnihive-worker-contacts/lib/models/ContactModel";
import dayjs from "dayjs";

interface AttendanceFormSubmitter {
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

export const submitAttendanceForm: AttendanceFormSubmitter = async ({
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
        GroupParticipants: participantIds.length,
        AnonParticipants: anonCount,
        ChildParticipants: childCount,
        TotalParticipants: participantIds.length + anonCount + childCount,
    });
};
