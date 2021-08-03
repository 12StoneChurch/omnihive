import { getUserById, getUserByUsername } from "@12stonechurch/omnihive-worker-users/common/GenericFunctions";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";

export async function checkNamePlusTwo(model: any, databaseWorker: IDatabaseWorker) {
    if (!model.FirstName || !model.LastName || (!model.Email && !model.Phone)) {
        return null;
    }

    let match: any = await databaseWorker.executeQuery(
        `exec api_12Stone_Custom_Contacts_GetMatching @firstName='${model.FirstName}', @lastName='${
            model.LastName
        }', @emailAddress='${model.Email}', @phone='${model.Phone}'${
            model.DateOfBirth ? `, @dob='${model.DateOfBirth}'` : ""
        }, @DomainId='1'`
    );

    if (match && match.length > 0) {
        return match[0][0];
    }

    const existingUser: any = await getUserByUsername(model.Email, databaseWorker);

    if (existingUser && existingUser.length > 0) {
        match = await getUserById(existingUser.UserId, databaseWorker);

        if (match) {
            return match[0][0];
        }
    }

    match.ContactId = 0;
    match.FirstName = model.FirstName;
    match.LastName = model.LastName;
    match.EmailAddress = model.Email;
    match.MobilePhone = model.Phone;
    match.DateOfBirth = model.DateOfBirth;

    return match;
}
