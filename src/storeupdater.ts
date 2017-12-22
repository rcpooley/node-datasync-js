import {DataSocket} from "./datasocket";
import {DataStore} from "./datastore";
import {ValidUpdateCallback} from "./types";

export class StoreUpdater {

    private updateCallbacks: ValidUpdateCallback[];

    constructor() {
        this.updateCallbacks = [];
    }

    public updateStore(socket: DataSocket, store: DataStore, path: string, value: any, failCallback: () => void, remove = false) {
        let valid = true;

        this.updateCallbacks.forEach(callback => {
             if (!callback(socket, store, path, value)) {
                 valid = false;
             }
        });

        if (!valid) {
            failCallback();
        } else {
            if (remove) {
                store.remove(path, [socket.id]);
            } else {
                store.update(path, value, [socket.id]);
            }
        }
    }

    /**
     * A method to add a listener to whenever a data store is updated
     * that will return true if a valid update, false otherwise
     * @param callback The callback
     */
    public subscribeOnUpdate(callback: ValidUpdateCallback) {
        this.updateCallbacks.push(callback);
    }
}