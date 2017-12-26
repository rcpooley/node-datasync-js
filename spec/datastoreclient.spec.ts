import {DataStoreClient} from "../src/datastoreclient";
import {DataSocket} from "../src/datasocket";
import {FakeSocket} from "../src/fakesocket";
import {dataSocketTester} from "./testers";
import {DataStores} from "../src/datastores";

describe('datastoreclient', () => {
    let client: DataStoreClient;
    let clientSocket: DataSocket, serverSocket: DataSocket;
    let serverStores: DataStores;

    it('should title', () => {
        console.log('\nDataStoreClient:');
        client = new DataStoreClient();
        let sockets = FakeSocket.getSockets('socket').map(fake => DataSocket.fromSocket(fake));
        clientSocket = sockets[0];
        serverSocket = sockets[1];
        serverStores = new DataStores();
    });

    it('should be a client', () => {
        expect(client.isClient()).toBe(true);
    });

    it('should set socket', () => {
        let socketTester = dataSocketTester(clientSocket);

        socketTester.assertHasListeners(false);

        client.setSocket(clientSocket);

        socketTester.assertHasListeners(true);
        socketTester.assertHasListeners(true, 'datasync_bindstore');
    });

    let onRequest = [];
    it('should connectStore', () => {
        serverSocket.on('datasync_bindrequest', (reqID, storeID, connInfo) => {
            onRequest = [reqID, storeID, connInfo];
        });

        let resp = client.connectStore('store', 'user', {lol: 'yep'});
        expect(resp).toBe(client);

        expect(onRequest[0].length).toBe(10);
        expect(onRequest[1]).toBe('store');
        expect(onRequest[2]).toEqual({lol: 'yep'});
    });

    it('should return the request', () => {
        let bindID = 'coolbindid';

        let fetchAll = false;
        serverSocket.on('datasync_fetchall_' + bindID, () => {
            fetchAll = true;
        });

        let store = serverStores.getStore('store', 'global', true);
        store.ref('/init').update('initval');

        expect(fetchAll).toBe(false);
        dataSocketTester(clientSocket).assertHasListeners(false, 'datasync_fetchall_' + bindID);

        serverSocket.emit('datasync_bindstore', onRequest[0], bindID);

        expect(fetchAll).toBe(true);
        dataSocketTester(clientSocket).assertHasListeners(true, 'datasync_fetchall_' + bindID);
    });

    it('should clear socket', () => {
        client.clearSocket();

        dataSocketTester(clientSocket).assertHasListeners(false);
    });

    it('should handle disconnectStore', () => {
        client.setSocket(clientSocket);

        onRequest = [];
        let resp = client.connectStore('store', 'user', {lol: 'yep'});
        expect(resp).toBe(client);

        expect(onRequest[0].length).toBe(10);
        expect(onRequest[1]).toBe('store');
        expect(onRequest[2]).toEqual({lol: 'yep'});

        let bindID = 'anotherone';

        let fetchAll = false;
        serverSocket.on('datasync_fetchall_' + bindID, () => {
            fetchAll = true;
        });

        let store = serverStores.getStore('store', 'global', true);
        store.ref('/init').update('initval');

        expect(fetchAll).toBe(false);
        dataSocketTester(clientSocket).assertHasListeners(false, 'datasync_fetchall_' + bindID);

        serverSocket.emit('datasync_bindstore', onRequest[0], bindID);

        expect(fetchAll).toBe(true);
        dataSocketTester(clientSocket).assertHasListeners(true, 'datasync_fetchall_' + bindID);

        let unbindID = null;
        serverSocket.on('datasync_unbindstore', bindID => unbindID = bindID);

        client.disconnectStore('store', 'user');
        expect(unbindID).toBe(bindID);
        dataSocketTester(clientSocket).assertHasListeners(false, 'datasync_fetchall_' + bindID);
    });

    it('should handle getStore', () => {
        let store = client.getStore('store', 'user');
        expect(store.storeid).toBe('store');
        expect(store.userid).toBe('user');
    });
});