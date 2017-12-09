import {DataSocket} from "./datasocket";
import {DataStoreManager} from "./datastoremanager";
import {OnBindCallback} from "./types";

export class DataStoreServer extends DataStoreManager {

    private onBindCallbacks: OnBindCallback[];

    constructor() {
        super();
        this.onBindCallbacks = [];
    }

    public addSocket(socket: DataSocket): void {
        socket.on('datasync_bindstore', storeid => {
            this.bindStore(socket, storeid, true);

            this.onBindCallbacks.forEach(callback => {
                callback(socket, this.getStore(storeid, socket.id));
            });
        });
    }

    public removeSocket(socket: DataSocket): void {
        socket.off('datasync_bindstore');

        this.clearStores(socket);
    }

    public onBind(callback: OnBindCallback) {
        this.onBindCallbacks.push(callback);
    }
}