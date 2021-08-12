import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";

export async function getUserById(userId: number, databaseWorker: IDatabaseWorker) {
    return (
        await databaseWorker.executeQuery(`api_12Stone_Custom_Contacts_GetByUserId @userId=${userId}, @DomainId='1'`)
    )[0][0];
}

export async function getUserByUsername(username: string, databaseWorker: IDatabaseWorker) {
    return await databaseWorker.executeQuery(
        `exec api_12Stone_Custom_Users_GetByUserName @userName='${username}' @DomainId='1'`
    );
}
