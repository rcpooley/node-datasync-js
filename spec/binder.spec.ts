import {Binder} from "../src/binder";
import {StoreUpdater} from "../src/storeupdater";
import {DataSocket} from "../src/datasocket";
import {FakeSocket} from "../src/fakesocket";
import {DataStores} from "../src/datastores";

describe('binder', () => {
    let binder: Binder;
    let clientSocket: DataSocket, serverSocket: DataSocket;
    let stores: DataStores;

    it('should title', () => {
        console.log('\nBinder:');
        binder = new Binder(new StoreUpdater());
        let sockets = FakeSocket.getSockets('socket').map(fake => DataSocket.fromSocket(fake));
        clientSocket = sockets[0];
        serverSocket = sockets[1];
        stores = new DataStores().serveStore('store');
    });

    let firstBindID;
    let firstStore;
    let firstUpdate = [];
    it('should bind store', () => {
        firstBindID = binder.getBindID(serverSocket);
        firstStore = stores.getStore('store', 'first', false);
        firstStore.ref('/init').update('val');

        firstUpdate = [];
        binder.bindStore(serverSocket, firstStore, firstBindID);

        clientSocket.on('datasync_update_' + firstBindID, update => {
            firstUpdate = [update.path, JSON.parse(update.value)];
        });

        expect(firstUpdate).toEqual([]);
    });

    it('should handle fetch all', () => {
        firstUpdate = [];

        clientSocket.emit('datasync_fetchall_' + firstBindID, '');

        expect(firstUpdate).toEqual(['/', {init: 'val'}]);
    });

    it('should handle store update (server side)', () => {
        firstUpdate = [];

        firstStore.ref('/update1').update({a: 'lol'});

        expect(firstUpdate).toEqual(['/update1', {a: 'lol'}]);
    });

    it('should handle store update (client side)', () => {
        firstUpdate = [];

        firstStore.ref('/update2').value(val => {
            expect(val).toBeNull();
        });

        clientSocket.emit('datasync_update_' + firstBindID, {
            path: '/update2',
            value: JSON.stringify({b: 'olo'})
        });

        expect(firstUpdate).toEqual([]);

        firstStore.ref('/update2').value(val => {
            expect(val).toEqual({b: 'olo'});
        });
    });
});