import * as ee from 'event-emitter';
import hasListeners = require('event-emitter/has-listeners');
import allOff = require('event-emitter/all-off');

export class FakeSocket {

    static lastID: number = 1;

    static getSockets(id?: string): FakeSocket[] {
        if (!id) {
            id = 'socket' + FakeSocket.lastID++;
        }
        let a = new FakeSocket(id);
        let b = new FakeSocket(id);
        a.sibling = b;
        b.sibling = a;
        return [a, b];
    }

    public id: string;
    private emitter: ee.Emitter;
    private sibling: FakeSocket;

    constructor(id: string) {
        this.id = id;
        this.emitter = ee(null);
    }

    on(event: string, listener: ee.EventListener): FakeSocket {
        this.sibling.emitter.on(event, listener);
        return this;
    }

    off(event: string, listener?: ee.EventListener): FakeSocket {
        let myAllOff: (emitter: ee.Emitter, event?: string) => void = allOff;

        if (listener) {
            this.sibling.emitter.off(event, listener);
        } else {
            myAllOff(this.sibling.emitter, event);
        }

        return this;
    }

    clearListeners(event?: string): FakeSocket {
        if (event) {
            return this.off(event);
        } else {
            allOff(this.sibling.emitter);
        }
    }

    emit(event: string, ...args: any[]): void {
        this.emitter.emit(event, ...args);
    }

    hasListeners(event?: string) {
        if (event) {
            return hasListeners(this.sibling.emitter, event);
        } else {
            return hasListeners(this.sibling.emitter);
        }
    }

    disconnect() {
        this.emit('disconnect', 'true');
        this.sibling.emit('disconnect', 'true');

        let sib = this.sibling;

        [this, sib].forEach(sock => {
            sock.sibling = new FakeSocket(this.id);
            sock.emitter = ee(null);
        });
    }
}