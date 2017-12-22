import {DataRef} from "./dataref";
import {ValuePathCallback, StoreUpdateCallback} from "./types";
import * as ee from 'event-emitter';
import {DataUtil} from "./datautil";
import {DataStores} from "./datastores";

interface InternalUpdate {
    path: string,
    flags: string[]
}

export class DataStore {

    private emitter: ee.Emitter;

    constructor(private manager: DataStores,
                public storeid: string,
                public userid: string) {
        this.emitter = ee(null);
    }

    public ref(path: string): DataRef {
        return new DataRef(this, path);
    }

    public value(path: string, callback: ValuePathCallback): void {
        this.manager.__ds__getDataValue(this, path, callback);
    }

    public update(path: string, newVal: any, flags = []): void {
        this.manager.__ds__updateData(this, path, newVal);

        this.emitter.emit('update', {
            path: DataUtil.formatPath(path),
            flags: flags
        });
    }

    public remove(path: string, flags = []): void {
        this.manager.__ds__deleteData(this, path);

        this.emitter.emit('update', {
            path: DataUtil.formatPath(path),
            flags: flags
        });
    }

    public on(event: string, path: string, callback: StoreUpdateCallback, emitOnBind = false): ee.EventListener {
        let ref = this.ref(path);

        let listener: ee.EventListener;

        this.emitter.on('update', listener = (update: InternalUpdate) => {
            let updateRef = this.ref(update.path);

            if (updateRef.isChildOf(ref)) {
                if (event == 'updateChild' && ref.equals(updateRef) ||
                    event == 'updateValue' && !ref.equals(updateRef) ||
                    event == 'updateDirect' && !ref.equals(updateRef)) {
                    return;
                }

                ref.value(value => {
                    callback(value, ref.getRelativeChildPath(updateRef), update.flags);
                });
            } else if (updateRef.hasChild(ref)) {
                if (event == 'updateChild' || event == 'updateDirect') {
                    return;
                }

                ref.value(value => {
                    callback(value, '/', update.flags);
                });
            }
        });

        if (emitOnBind) {
            ref.value(value => {
                callback(value, '/', []);
            });
        }

        return listener;
    }

    public off(listener: ee.EventListener): void {
        this.emitter.off('update', listener);
    }
}