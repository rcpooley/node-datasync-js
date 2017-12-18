import {StoreUpdater} from "../src/storeupdater";
import {DataStores} from "../src/datastores";
import {FakeSocket} from "../src/fakesocket";
import {DataSocket} from "../src/datasocket";
import {DataStore} from "../src/datastore";

describe('storeupdater', () => {
    let updater: StoreUpdater;

    let store = new DataStores().getStore('store', 'user', true);
    let socket = FakeSocket.getSockets('socket').map(fake => DataSocket.fromSocket(fake))[0];

    it('should title', () => {
        console.log('\nStoreUpdater:');
        updater = new StoreUpdater();
    });

    it('should handle updateStore', () => {
        store.ref('/test').value(val => {
            expect(val).toBeNull();
        });

        updater.updateStore(socket, store, '/test', 'newval', () => {
            expect(true).toBe(false);
        });

        store.ref('/test').value(val => {
            expect(val).toBe('newval');
        });
    });

    it('should handle update callbacks', () => {
        let update = [];
        let shouldFail = false;

        let callback = (sock: DataSocket, storr: DataStore, path: string, value: any) => {
            expect(sock).toBe(socket);
            expect(storr).toBe(store);
            update = [path, value];
            return !shouldFail;
        };

        updater.subscribeOnUpdate(callback);
        updater.subscribeOnUpdate(callback);

        update = [];
        shouldFail = false;
        updater.updateStore(socket, store, '/u1', 'v1', () => {
            expect(true).toBe(false);
        });
        expect(update).toEqual(['/u1', 'v1']);

        update = [];
        shouldFail = true;
        updater.updateStore(socket, store, '/u2', 'v2', () => {
        });
        expect(update).toEqual(['/u2', 'v2']);
    });
});