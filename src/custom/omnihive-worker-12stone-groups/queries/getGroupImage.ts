import { danyGet } from "@12stonechurch/omnihive-worker-common/helpers/DanyHelper";

interface GroupImageGetter {
    (opts: { groupId: number }): Promise<string | undefined>;
}

export const getGroupImage: GroupImageGetter = async ({ groupId }) => {
    const {
        data: {
            Group: { PhotoUrl },
        },
    } = await danyGet("/Groups/" + groupId);

    return PhotoUrl || undefined;
};
