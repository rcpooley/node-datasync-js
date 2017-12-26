import {Binder} from "./binder";
import {DataStores} from "./datastores";
import {StoreUpdater} from "./storeupdater";
import {ValidUpdateCallback} from "./types";

export class DataStoreManager {

    private updater: StoreUpdater;
    protected binder: Binder;
    protected stores: DataStores;

    constructor() {
        this.updater = new StoreUpdater();
        this.binder = new Binder(this.updater, this.isClient() ? 'client' : 'server');
        this.stores = new DataStores();
    }

    public isClient(): boolean {
        return !!this['connectStore'];
    }

    public subscribeOnUpdate(callback: ValidUpdateCallback) {
        this.updater.subscribeOnUpdate(callback);
    }
}