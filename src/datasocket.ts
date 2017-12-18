export class DataSocket {

    static fromSocket(socket: any): DataSocket {
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
        }, (a, ...b) => {
            socket.emit(a, ...b);
        }, socket);
    }

    constructor(public id: string,
                private onFunc: Function,
                private offFunc: Function,
                private emitFunc: Function,
                public tag?: any) {
    }

    on(event: any, listener: any) {
        this.onFunc(event, listener);
    }

    off(event: any, listener?: any) {
        this.offFunc(event, listener);
    }

    emit(event: any, ...data: any[]) {
        this.emitFunc(event, ...data);
    }
}