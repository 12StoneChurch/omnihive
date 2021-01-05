import { PubSubListener } from "@withonevision/omnihive-hive-common/models/PubSubListener";
import { IHiveWorker } from "./IHiveWorker";

export interface IPubSubClientWorker extends IHiveWorker {
    getListeners: () => PubSubListener[];
    getJoinedChannels: () => string[];
    addListener: (channelName: string, eventName: string, callback?: any) => void;
    removeListener: (channelName: string, eventName: string) => void;
    connect: () => Promise<void>;
    disconnect: () => void;
    joinChannel: (channelName: string) => void;
    leaveChannel: (channelName: string) => void;
}