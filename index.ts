import * as ee from 'event-emitter';
import * as dbg from 'debug';

let debug = dbg('datasync-js');

interface DataUpdate {
    storeid: string;
    path: string;
    value: any;
}

export class DataSocket {

    static fromSocket(socket: any) {
        return new DataSocket(socket.id, (a, b) => {
            socket.on(a, b);
        }, (a, b) => {
            if (socket.off) {
                return socket.off(a, b);
            }

            if (b) {
                socket.removeListener(a, b);
            } else {
                socket.removeAllListeners(a);
            }
        }, (a, b) => {
            socket.emit(a, b);
        }, socket);
    }

    constructor(public id: string, private onFunc: Function, private offFunc: Function, private emitFunc: Function, public object?: any) {
    }

    on(event: any, listener: any) {
        this.onFunc(event, listener);
    }

    off(event: any, listener?: any) {
        this.offFunc(event, listener);
    }

    emit(event: any, data: any) {
        this.emitFunc(event, data);
    }
}

export class DataStoreServer {

    private socketStoreMap: {[socketid: string]: {[storeid: string]: Function}};

    constructor(private fetchStore: (socket: DataSocket, storeid: string, callback: (store: DataStore) => void) => void) {
        this.socketStoreMap = {};
    }

    private getStoreMap(socketid: string): {[storeid: string]: Function} {
        if (!(socketid in this.socketStoreMap)) {
            this.socketStoreMap[socketid] = {};
        }
        return this.socketStoreMap[socketid];
    }

    private emitStore(socket: DataSocket, storeid: string, store: DataStore, sendRoot = false): void {
        let sendUpdate = path => {
            let updateObj = {
                storeid: storeid,
                path: path,
                value: store.ref(path).value()
            };
            debug(`Sending update to socket ${socket.id}: ${JSON.stringify(updateObj, null, 2)}`);
            socket.emit('datasync_update', updateObj);
        };

        if (sendRoot) {
            sendUpdate('/');
        }

        let listener;

        store.events.on('update', listener = (update: any) => {
            if (update.flags.indexOf(socket.id) == -1) {
                sendUpdate(update.path);
            }
        });

        this.getStoreMap(socket.id)[storeid] = listener;
    }

    private unEmitStore(socket: DataSocket, storeid: string): void {
        this.fetchStore(socket, storeid, (store: DataStore) => {
            let listener = this.getStoreMap(socket.id)[storeid];
            store.events.off('update', listener);
            delete this.socketStoreMap[socket.id][storeid];
        });
    }

    public addSocket(socket: DataSocket): void {
        socket.on('datasync_bindstore', storeid => {
            debug(`Bind request from socket ${socket.id} for store ${storeid}`);
            this.fetchStore(socket, storeid, (store: DataStore) => {
                this.emitStore(socket, storeid, store, true);
            });
        });

        socket.on('datasync_unbindstore', storeid => {
            debug(`Unbind request from socket ${socket.id} for store ${storeid}`);

            this.unEmitStore(socket, storeid);
        });

        socket.on('datasync_update', (updateObj: DataUpdate) => {
            this.fetchStore(socket, updateObj.storeid, (store: DataStore) => {
                let pathRef = store.ref(updateObj.path);

                let updateValid = true;
                store.readOnly.forEach(ref => {
                    if (pathRef.isChildOf(ref)) {
                        updateValid = false;
                    }
                });

                if (updateValid) {
                    debug(`Got update from socket ${socket.id}: ${JSON.stringify(updateObj, null, 2)}`);
                    store.update(updateObj.path, updateObj.value, [socket.id]);
                } else {
                    debug(`Got invalid readonly update from socket ${socket.id}: ${JSON.stringify(updateObj, null, 2)}`);
                    socket.emit('datasync_update', {
                        storeid: updateObj.storeid,
                        path: updateObj.path,
                        value: pathRef.value()
                    });
                }
            });
        });

        socket.on('disconnect', () => {
            this.removeSocket(socket);
        });
    }

    private removeSocket(socket: DataSocket): void {
        socket.off('datasync_bindstore');
        socket.off('datasync_unbindstore');
        socket.off('datasync_update');

        let storemap = this.getStoreMap(socket.id);
        Object.keys(storemap).forEach(storeid => {
            this.unEmitStore(socket, storeid);
        });

        delete this.socketStoreMap[socket.id];
    }

    public bindStore(socket: DataSocket, storeid: string): void {
        debug(`Binding store ${storeid} with socket ${socket.id}`);
        this.fetchStore(socket, storeid, (store: DataStore) => {
            socket.emit('datasync_bindstore', storeid);

            this.emitStore(socket, storeid, store, false);
        });
    }

    public unbindStore(socket: DataSocket, storeid: string): void {
        debug(`Unbinding store ${storeid} with socket ${socket.id}`);

        socket.emit('datasync_unbindstore', storeid);

        this.unEmitStore(socket, storeid);
    }
}

export class DataStore {
    private data: any;
    public events;
    public readOnly: DataRef[];

    constructor() {
        this.data = undefined;
        this.events = ee(null);
        this.readOnly = [];
    }

    public static formatPath(path: string): string {
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        if (path.endsWith('/')) {
            path = path.substring(0, path.length - 1);
        }
        if (path == '') {
            path = '/';
        }
        return path;
    }

    private getValue(path: string, initPath = false) {
        let spl = path.split('/');

        if (initPath && !this.data) {
            this.data = {};
        }

        let cur = this.data;

        if (path == '/') {
            return cur;
        }

        for (let i = 1; i < spl.length; i++) {
            if (typeof cur != 'object') {
                return;
            }

            if (spl[i] in cur) {
                if (i < spl.length && initPath && typeof cur[spl[i]] != 'object') {
                    cur[spl[i]] = {};
                }
                cur = cur[spl[i]];
            } else if (initPath) {
                cur[spl[i]] = {};
                cur = cur[spl[i]];
            } else {
                return;
            }
        }

        return cur;
    }

    public ref(path: string): DataRef {
        return new DataRef(this, path);
    }

    public value(path: string, keepMem = false) {
        let node = this.getValue(path);

        if (!node) {
            return node;
        }

        if (keepMem) {
            return node;
        } else {
            return JSON.parse(JSON.stringify(node));
        }
    }

    public update(path: string, newVal: any, flags = []): void {
        let ref = this.ref(path);

        if (ref.path == '/') {
            this.data = newVal;
        } else {
            let parent = ref.parent();

            let node = this.getValue(parent.path, true);
            node[ref.name] = newVal;
        }

        this.events.emit('update', {
            path: ref.path,
            flags: flags
        });
    }
}

export class DataRef {

    public path: string;
    public name: string;

    constructor(private store: DataStore, path: string) {
        this.path = DataStore.formatPath(path);
        let spl = this.path.split('/');
        this.name = spl[spl.length - 1];
    }

    public parent(): DataRef {
        return this.store.ref(this.path.substring(0, this.path.length - this.name.length));
    }

    public ref(path: string): DataRef {
        let tmpPath = this.path + DataStore.formatPath(path);
        if (this.path == '/') {
            tmpPath = path;
        }
        return this.store.ref(tmpPath);
    }

    public hasChild(ref: DataRef): boolean {
        return ref.path.indexOf(this.path) == 0;
    }

    public isChildOf(ref: DataRef): boolean {
        return ref.hasChild(this);
    }

    public value(keepMem = false): any {
        return this.store.value(this.path, keepMem);
    }

    public update(newVal: any): void {
        this.store.update(this.path, newVal);
    }

    public on(event: string, callback: (newVal: any, updatePath: string) => void, emitOnBind = false): void {
        this.store.events.on('update', (obj: any) => {
            let path = obj.path;
            let ref = this.store.ref(path);
            if (ref.isChildOf(this)) {
                if (event == 'updateChild' && this.path == path) {
                    return;
                }

                if (event == 'updateValue' && this.path != path) {
                    return;
                }

                let relPath = DataStore.formatPath(path.substring(this.path.length));
                callback(this.value(), relPath);
            }
        });

        if (emitOnBind) {
            callback(this.value(), '/');
        }
    }

    public readOnly(state = true): void {
        if (state) {
            this.store.readOnly.push(this);
        } else {
            for (let i = this.store.readOnly.length - 1; i >= 0; i--) {
                if (this.store.readOnly[i].path == this.path) {
                    this.store.readOnly.splice(i, 1);
                }
            }
        }
    }
}

export class DataStores {
    private stores: {[storeid: string]: DataStore};

    constructor() {
        this.stores = {};
    }

    public getStore(storeid: string): DataStore {
        if (!(storeid in this.stores)) {
            this.stores[storeid] = new DataStore();
        }
        return this.stores[storeid];
    }
}