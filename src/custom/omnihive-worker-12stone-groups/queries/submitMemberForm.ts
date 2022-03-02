import { danyPost } from "@12stonechurch/omnihive-worker-common/helpers/DanyHelper";

interface MemberFormSubmitter {
    (opts: {
        formId: number;
        groupId: number;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
    }): Promise<number>;
}

export const submitMemberForm: MemberFormSubmitter = async ({ formId, groupId, firstName, lastName, email, phone }) => {
    const {
        data: { ContactId },
    } = await danyPost("/Forms/" + formId + "/Respond", {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Phone: phone || "",
        GroupId: groupId,
    });

    return ContactId;
};
