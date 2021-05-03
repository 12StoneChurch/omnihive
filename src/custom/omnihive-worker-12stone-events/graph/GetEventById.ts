import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { serializeError } from "serialize-error";
import { GetEventsByIdList } from "../common/GetEventsByIdList";
import { Event } from "../lib/models/Event";

/**
 * Args:
 *  id: number
 *  participantId: number
 */

export default class EventSearch extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any): Promise<Event> => {
        try {
            const eventId: number = customArgs.id;
            const participantId: number = customArgs.participantId;

            return (await GetEventsByIdList([eventId], participantId))[0];
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}
