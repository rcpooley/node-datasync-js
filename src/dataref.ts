import {DataStore} from "./datastore";
import {ValuePathCallback, StoreUpdateCallback} from "./types";
import {DataUtil} from "./datautil";
import * as ee from 'event-emitter';

export class DataRef {

    private iPath: string;
    private iName: string;

    constructor(private store: DataStore, path: string) {
        this.iPath = DataUtil.formatPath(path);
        this.iName = DataUtil.getNameFromPath(this.iPath);
    }

    public path(): string {
        return this.iPath;
    }

    public name(): string {
        return this.iName;
    }

    public parent(): DataRef {
        return this.store.ref(this.iPath.substring(0, this.iPath.length - this.iName.length));
    }

    public hasChild(ref: DataRef): boolean {
        return ref.path().indexOf(this.iPath) == 0;
    }

    public isChildOf(ref: DataRef): boolean {
        return ref.hasChild(this);
    }

    public getRelativeChildPath(childRef: DataRef): string {
        return DataUtil.formatPath(childRef.path().substring(this.iPath.length));
    }

    public equals(ref: DataRef): boolean {
        return this.iPath === ref.path();
    }

    public ref(path: string): DataRef {
        let tmpPath = this.iPath + DataUtil.formatPath(path);
        if (this.iPath == '/') {
            tmpPath = path;
        }
        return this.store.ref(tmpPath);
    }

    public value(callback: ValuePathCallback): void {
        this.store.value(this.iPath, callback);
    }

    public update(newVal: any, flags = []): void {
        this.store.update(this.iPath, newVal, flags);
    }

    public remove(flags = []): void {
        this.store.remove(this.iPath, flags);
    }

    public on(event: string, callback: StoreUpdateCallback, emitOnBind = false): ee.EventListener {
        return this.store.on(event, this.iPath, callback, emitOnBind);
    }

    public off(listener: ee.EventListener): void {
        this.store.off(listener);
    }
}