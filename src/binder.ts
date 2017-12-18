import {DataSocket} from "./datasocket";
import {DataStore} from "./datastore";
import * as ee from 'event-emitter';
import {StoreUpdater} from "./storeupdater";
import {DataUtil} from "./datautil";
import * as dbg from 'debug';

let mydbg = dbg('datasync-js');

type BindIDMap = {[bindID: string]: {
    store: DataStore,
    listener: ee.EventListener
}};

interface DataUpdate {
    path: string;
    value: string;
}

export class Binder {

    private listeners: {[socketid: string]: BindIDMap};

    private debug(txt: string): void {
        let pre = this.debugPrefix ? '(' + this.debugPrefix + ') ' : '';
        console.log(pre + txt);
    }

    constructor(private updater: StoreUpdater, private debugPrefix?: string) {
        this.listeners = {};
    }

    private getListeners(socketid: string): BindIDMap {
        if (!(socketid in this.listeners)) {
            this.listeners[socketid] = {};
        }
        return this.listeners[socketid];
    }

    public bindStore(socket: DataSocket, store: DataStore, bindID: string, emitOnBind = false): void {
        this.debug(`(${store.storeid}-${store.userid}) binding store from #${socket.id}`);
        let sendUpdate = (path, value) => {
            this.debug(`(${store.storeid}-${store.userid}) sending update (${path}, ${JSON.stringify(value)}) to #${socket.id}`);
            socket.emit('datasync_update_' + bindID, {
                path: path,
                value: JSON.stringify(value)
            });
        };

        socket.on('datasync_fetchall_' + bindID, () => {
            store.ref('/').value(val => {
                sendUpdate('/', val);
            });
        });

        socket.on('datasync_update_' + bindID, (update: DataUpdate) => {
            this.debug(`(${store.storeid}-${store.userid}) got update update (${update.path}, ${update.value}) to #${socket.id}`);
            this.updater.updateStore(socket, store, update.path, JSON.parse(update.value), () => {
                store.ref(update.path).value(val => {
                    sendUpdate(update.path, val);
                });
            });
        });

        this.getListeners(socket.id)[bindID] = {
            store: store,
            listener: store.ref('/').on('update', (value, path, flags) => {
                if (flags.indexOf(socket.id) >= 0) {
                    return;
                }

                store.ref(path).value(value => {
                    sendUpdate(path, value);
                });
            }, emitOnBind)
        };
    }

    public unbindStore(socket: DataSocket, bindID: string): void {
        socket.off('datasync_update_' + bindID);
        socket.off('datasync_fetchall_' + bindID);

        let bind = this.getListeners(socket.id)[bindID];

        if (!bind) return;

        this.debug(`(${bind.store.storeid}-${bind.store.userid}) unbinding store from #${socket.id}`);

        bind.store.off(bind.listener);

        delete this.getListeners(socket.id)[bindID];
    }

    public unbindAll(socket: DataSocket): void {
        Object.keys(this.getListeners(socket.id)).forEach(bindID => {
            this.unbindStore(socket, bindID);
        });
    }

    public getBindID(socket: DataSocket): string {
        let valid, bindID;

        let curIDs = Object.keys(this.getListeners(socket.id));

        do {
            bindID = DataUtil.randomString(10);
            valid = curIDs.indexOf(bindID) == -1;
        } while(!valid);

        return bindID;
    }
}