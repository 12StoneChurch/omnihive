import { danyGet } from "src/custom/omnihive-worker-12stone-common/helpers/DanyHelper";

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
