import {DataStore} from "./datastore";
import {ValuePathCallback, ValidUpdateCallback} from "./types";
import {DataUtil} from "./datautil";
import {DataSocket} from "./datasocket";

export class DataStoreWrap {
    public data: any;
    public store: DataStore;

    constructor(manager: DataStoreManager, storeid: string, userid?: string) {
        this.data = {};
        this.store = new DataStore(manager, storeid, userid);
    }
}

export type StoreDataMap = {[storeid: string]: DataStoreWrap};
export type UserStoreDataMap = {[storeid: string]: {[userid: string]: DataStoreWrap}};

interface DataUpdate {
    path: string;
    value: string;
}

export class DataStoreManager {

    protected globalStoreData: StoreDataMap;
    protected userStoreData: UserStoreDataMap;
    private validUpdateCallbacks: ValidUpdateCallback[];

    constructor() {
        this.globalStoreData = {};
        this.userStoreData = {};
        this.validUpdateCallbacks = [];
    }

    /**
     * An internal method that should only be called from DataStore
     *
     * @param store The DataStore we are working with
     * @param rawPath The path to the value to fetch
     * @param callback A callback to return the data
     * @private
     */
    public __ds__getDataValue(store: DataStore, rawPath: string, callback: ValuePathCallback) {
        let path = DataUtil.formatPath(rawPath);

        let storeid = store.storeid;
        let userid = store.userid;

        let wrap: DataStoreWrap;

        if (storeid in this.globalStoreData) {
            wrap = this.globalStoreData[storeid];
        } else {
            wrap = this.userStoreData[storeid][userid];
        }

        callback(DataUtil.traverseObject(wrap.data, path), path);
    }

    /**
     * And internal method that should only be called from DataStore
     *
     * @param store The DataStore we are working with
     * @param rawPath The path to the value to update
     * @param newVal The new value
     * @private
     */
    public __ds__updateData(store: DataStore, rawPath: string, newVal: any) {
        let path = DataUtil.formatPath(rawPath);

        let storeid = store.storeid;
        let userid = store.userid;

        let wrap: DataStoreWrap;

        if (storeid in this.globalStoreData) {
            wrap = this.globalStoreData[storeid];
        } else {
            wrap = this.userStoreData[storeid][userid];
        }

        if (path == '/') {
            wrap.data = newVal;
        } else {
            if (!DataUtil.isObject(wrap.data)) {
                wrap.data = {};
            }

            DataUtil.traverseObjectForReference(wrap.data, path)[DataUtil.getNameFromPath(path)] = newVal;
        }
    }

    /**
     * Will register storeid as a global store
     *
     * @param storeid The storeid to register
     */
    public serveGlobal(storeid: string): DataStoreManager {
        this.globalStoreData[storeid] = new DataStoreWrap(this, storeid);
        return this;
    }

    /**
     * Will register storeid as a by user store
     *
     * @param storeid The storeid to register
     */
    public serveByUser(storeid: string): DataStoreManager {
        this.userStoreData[storeid] = {};
        return this;
    }

    /**
     * Will return the corresponding store
     *
     * @param storeid The storeid to search for
     * @param userid The user id accessing the store
     * @returns {DataStore}
     * @throws TypeError if store not found
     */
    public getStore(storeid: string, userid?: string): DataStore {
        if (storeid in this.globalStoreData) {
            return this.globalStoreData[storeid].store;
        }

        if (!!userid && storeid in this.userStoreData) {
            let userStores = this.userStoreData[storeid];

            if (!(userid in userStores)) {
                userStores[userid] = new DataStoreWrap(this, storeid, userid);
            }

            return userStores[userid].store;
        }

        throw new TypeError("Invalid storeid: " + storeid + ", " + userid);
    }

    /**
     * A method to send and receive updates for a specified store over a socket
     * @param socket The socket to send/receive updates
     * @param storeid The store ID
     * @param emitOnBind If true, will emit all data on the store after this function has finished executing
     */
    protected bindStore(socket: DataSocket, storeid: string, emitOnBind = false): void {
        let sendUpdate = (path, value) => {
            socket.emit('datasync_update_' + storeid, {
                path: path,
                value: JSON.stringify(value)
            });
        };

        let store = this.getStore(storeid, socket.id);

        socket.on('datasync_update_' + storeid, (update: DataUpdate) => {
            let valid = true;

            let updateValue = JSON.parse(update.value);

            this.validUpdateCallbacks.forEach(callback => {
                if (!callback(storeid, socket, update.path, updateValue)) {
                    valid = false;
                }
            });

            if (valid) {
                store.update(update.path, updateValue, [socket.id]);
            } else {
                store.ref(update.path).value((value, path) => {
                    sendUpdate(path, value);
                });
            }
        });

        socket.__ds__listeners[storeid] = store.ref('/').on('update', (value, path, flags) => {
            if (flags.indexOf(socket.id) >= 0) {
                return;
            }

            store.ref(path).value(value => {
                sendUpdate(path, value);
            });
        }, emitOnBind);
    }

    /**
     * A method to stop sending and receiving updates for the store
     * @param socket The socket to halt updates
     * @param storeid The store ID
     */
    protected unbindStore(socket: DataSocket, storeid: string): void {
        let store = this.getStore(storeid, socket.id);

        socket.off('datasync_update_' + storeid);

        store.off(socket.__ds__listeners[storeid]);

        delete socket.__ds__listeners[storeid];
    }

    /**
     * A method to clear all stores that the specified socket is bound to
     * @param socket The socket to clear all bound stores
     */
    protected clearStores(socket: DataSocket): void {
        Object.keys(socket.__ds__listeners).forEach(storeid => {
            this.unbindStore(socket, storeid);
        });
    }

    /**
     * A method to add a listener to whenever a data store is updated
     * that will return true if a valid update, false otherwise
     * @param callback The callback
     */
    public subscribeOnUpdate(callback: ValidUpdateCallback) {
        this.validUpdateCallbacks.push(callback);
    }
}