import * as events from 'events';
import {Socket} from 'socket.io';

interface DataUpdate {
    storeid: string;
    path: string;
    value: any;
}

export class DataStoreServer {

    constructor(private fetchStore: (socket: Socket, storeid: string, callback: (store: DataStore) => void) => void) {
    }

    private emitStore(socket: Socket, storeid: string, store: DataStore, sendRoot = false): void {
        let sendUpdate = path => {
            socket.emit('datasync_update', {
                storeid: storeid,
                path: path,
                value: store.ref(path).value()
            });
        };

        if (sendRoot) {
            sendUpdate('/');
        }

        store.on('update', (update: any) => {
            if (update.flags.indexOf('local') == -1) {
                sendUpdate(update.path);
            }
        });
    }

    public addSocket(socket: Socket): void {
        socket.on('datasync_bindstore', storeid => {
            this.fetchStore(socket, storeid, (store: DataStore) => {
                this.emitStore(socket, storeid, store, true);
            });
        });

        socket.on('datasync_update', (updateObj: DataUpdate) => {
            this.fetchStore(socket, updateObj.storeid, (store: DataStore) => {
                store.update(updateObj.path, updateObj.value, ['local']);
            });
        });
    }

    public bindStore(socket: Socket, storeid: string): void {
        this.fetchStore(socket, storeid, (store: DataStore) => {
            socket.emit('datasync_bindstore', storeid);

            this.emitStore(socket, storeid, store);
        });
    }
}

export class DataStore extends events.EventEmitter {
    private data: any;

    constructor() {
        super();
        this.data = undefined;
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

        this.emit('update', {
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

    public on(event: string, callback: (newVal: any, updatePath: string) => void): void {
        this.store.on('update', (obj: any) => {
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
    }
}