import { danyPost } from "src/custom/omnihive-worker-12stone-common/helpers/DanyHelper";

interface MemberFormSubmitter {
    (opts: { formId: number; firstName: string; lastName: string; email: string; phone?: string }): Promise<number>;
}

export const submitMemberForm: MemberFormSubmitter = async ({ formId, firstName, lastName, email, phone }) => {
    const {
        data: { ContactId },
    } = await danyPost("/Forms/" + formId + "/Respond", {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Phone: phone || "",
    });

    return ContactId;
};
