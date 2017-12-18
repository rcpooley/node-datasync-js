import {DataStore} from "./datastore";
import {DataUtil} from "./datautil";
import {ValuePathCallback} from "./types";

class DataStoreWrap {
    public data: any;
    public store: DataStore;

    constructor(manager: DataStores, storeid: string, userid: string) {
        this.data = {};
        this.store = new DataStore(manager, storeid, userid);
    }
}

type UserStoreMap = {[userid: string]: DataStoreWrap};
type StoreUserMap = {[storeid: string]: UserStoreMap};

export class DataStores {

    private stores: StoreUserMap;

    constructor() {
        this.stores = {};
    }

    private getStores(storeid: string): UserStoreMap {
        if (!(storeid in this.stores)) {
            this.stores[storeid] = {};
        }
        return this.stores[storeid];
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

        let wrap = this.getStores(store.storeid)[store.userid];

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

        let wrap = this.getStores(store.storeid)[store.userid];

        if (path == '/') {
            wrap.data = newVal;
        } else {
            if (!DataUtil.isObject(wrap.data)) {
                wrap.data = {};
            }

            DataUtil.traverseObjectForReference(wrap.data, path)[DataUtil.getNameFromPath(path)] = newVal;
        }
    }

    public getStore(storeid: string, userid: string, initialize: boolean) {
        if (!(storeid in this.stores) && !initialize) {
            throw new TypeError(`Invalid storeid: ${storeid}-${userid}`);
        }

        let stores = this.getStores(storeid);

        if (!(userid in stores)) {
            stores[userid] = new DataStoreWrap(this, storeid, userid);
        }

        return stores[userid].store;
    }

    public serveStore(storeid: string): DataStores {
        this.getStores(storeid);
        return this;
    }

    public hasStore(storeid: string): boolean {
        return (storeid in this.stores);
    }
}