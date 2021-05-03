import dayjs from "dayjs";
import { WatchContent } from "@12stonechurch/omnihive-worker-common/models/WatchModels";

export const transformDataToWatchContent = (data: any): WatchContent | undefined => {
    const content: WatchContent = {
        id: data.DocumentId,
        duration: data["Video Attributes - Video Length"],
        date: dayjs(data.PublishDate),
        description: data.Content,
        poster: data["Featured Image Url"],
        title: data.Title,
        url: data["Video Attributes - Video Url"],
        slug: data["Slug"],
    };

    if (content.id && content.date && content.poster && content.title) {
        return content;
    }

    return undefined;
};
