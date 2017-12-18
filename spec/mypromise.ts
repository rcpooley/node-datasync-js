import * as ee from 'event-emitter';

export class MyPromise {

    public static all(list: MyPromise[]): MyPromise {
        return new MyPromise((resolve, reject) => {
            MyPromise.doAll(list, () => {
                let resVals = [],
                    rejVals = [];
                list.forEach(prom => {
                    resVals.push(prom.resolveVal);
                    rejVals.push(prom.rejectVal);
                });
                resolve(resVals);
                reject(rejVals);
            });
        });
    }

    private static doAll(list: MyPromise[], callback: Function) {
        if (list.length == 0) {
            return callback();
        }

        let next = () => {
            MyPromise.doAll(list.slice(1), callback);
        };

        list[0].then(next, next);
    }

    private emitter: ee.Emitter;
    private resolveVal: any;
    private rejectVal: any;
    private hasResolved: boolean;
    private hasRejected: boolean;

    constructor(callback: Function) {
        this.emitter = ee(null);
        this.resolveVal = null;
        this.rejectVal = null;

        callback(val => {
            this.resolveVal = val;
            this.hasResolved = true;
            this.emitter.emit('resolved');
        }, val => {
            this.rejectVal = val;
            this.hasRejected = true;
            this.emitter.emit('rejected');
        });
    }

    public then(resolveCallback?: Function, rejectCallback?: Function) {
        if (resolveCallback) {
            this.emitter.on('resolved', () => {
                resolveCallback(this.resolveVal);
            });

            if (this.hasResolved) {
                resolveCallback(this.resolveVal);
            }
        }

        if (rejectCallback) {
            this.emitter.on('rejected', () => {
                rejectCallback(this.rejectVal);
            });

            if (this.hasRejected) {
                rejectCallback(this.rejectVal);
            }
        }
    }
}