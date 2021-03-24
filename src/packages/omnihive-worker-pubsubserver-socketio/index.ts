import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { IPubSubServerWorker } from "@withonevision/omnihive-core/interfaces/IPubSubServerWorker";
import { HiveWorker } from "@withonevision/omnihive-core/models/HiveWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { PubSubListener } from "@withonevision/omnihive-core/models/PubSubListener";
import { serializeError } from "serialize-error";
import * as socketio from "socket.io";

export class SocketIoPubSubServerWorkerMetadata {
    public port: number = 8080;
}

export default class SocketIoPubSubServerWorker extends HiveWorkerBase implements IPubSubServerWorker {
    private ioServer!: socketio.Server;
    private listeners: PubSubListener[] = [];

    constructor() {
        super();
    }

    public async init(config: HiveWorker): Promise<void> {
        await AwaitHelper.execute<void>(super.init(config));
        const metadata: SocketIoPubSubServerWorkerMetadata = this.checkObjectStructure<SocketIoPubSubServerWorkerMetadata>(
            SocketIoPubSubServerWorkerMetadata,
            this.config.metadata
        );

        this.ioServer = new socketio.Server();
        this.ioServer.listen(metadata.port);

        this.ioServer.on("connection", (socket: socketio.Socket) => {
            socket.on("join-room", (room: string) => {
                socket.join(room);
            });

            socket.on("leave-room", (room: string) => {
                socket.leave(room);
            });
        });
    }

    public addListener = (channelName: string, eventName: string, callback?: Function): void => {
        try {
            this.removeListener(channelName, eventName);

            if (!this.listeners.some((listener: PubSubListener) => listener.eventName === eventName)) {
                this.ioServer.addListener(eventName, (packet: { room: string; data: any }) => {
                    if (packet.room === channelName && callback && typeof callback === "function") {
                        callback(packet.data);
                    }
                });
            }

            this.listeners.push({ channelName, eventName, callback });
        } catch (err) {
            throw new Error("PubSub Add Listener Error => " + JSON.stringify(serializeError(err)));
        }
    };

    public emit = async (channelName: string, eventName: string, message: any): Promise<void> => {
        this.ioServer.to(channelName).emit(eventName, { room: channelName, data: message });
    };

    public getListeners = (): PubSubListener[] => {
        return this.listeners;
    };

    public removeListener = (channelName: string, eventName: string): void => {
        try {
            if (
                this.listeners.some(
                    (listener: PubSubListener) =>
                        listener.channelName == channelName && listener.eventName === eventName
                )
            ) {
                const listener: PubSubListener | undefined = this.listeners.find(
                    (listener: PubSubListener) =>
                        listener.channelName == channelName && listener.eventName === eventName
                );

                this.listeners = this.listeners.filter(
                    (listener: PubSubListener) =>
                        listener.channelName == channelName && listener.eventName !== eventName
                );

                if (listener && listener.callback) {
                    this.ioServer.removeListener(eventName, listener.callback);
                }
            }
        } catch (err) {
            throw new Error("PubSub Remove Listener Error => " + JSON.stringify(serializeError(err)));
        }
    };
}
