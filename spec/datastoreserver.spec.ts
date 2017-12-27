import {DataStoreServer} from "../src/datastoreserver";
import {DataSocket} from "../src/datasocket";
import {FakeSocket} from "../src/fakesocket";
import {dataSocketTester} from "./testers";
import {MyPromise} from "./mypromise";

let oldpromise;

describe('datastoreserver', () => {
    let server: DataStoreServer;
    let clientSocket: DataSocket, serverSocket: DataSocket;
    let clientSocketTester, serverSocketTester;

    it('should title', () => {
        oldpromise = global.Promise;
        global.Promise = MyPromise;
        console.log('\nDataStoreServer:');
        server = new DataStoreServer();
        let sockets = FakeSocket.getSockets('flysocket').map(fake => DataSocket.fromSocket((fake)));
        clientSocket = sockets[0];
        serverSocket = sockets[1];
        clientSocketTester = dataSocketTester(clientSocket);
        serverSocketTester = dataSocketTester(serverSocket);
    });

    it('should fail getStore that doesn\'nt exist', () => {
        try {
            server.getStore('store');
            expect(true).toBe(false);
        } catch(e) {
            expect(e.message).toBe('Invalid storeid: store-global');
        }
    });

    it('should serveGlobal', () => {
        server.serveGlobal('store');

        let store1 = server.getStore('store');
        let store2 = server.getStore('store', 'user');
        expect(store1).toBe(store2);
    });

    it('should serveByUser', () => {
        server.serveByUser('user');

        let store1 = server.getStore('user', 'u1');
        let store2 = server.getStore('user', 'u2');
        expect(store1.userid).toBe('u1');
        expect(store2.userid).toBe('u2');
    });

    it('should addSocket', () => {
        serverSocketTester.assertHasListeners(false);

        server.addSocket(serverSocket);

        serverSocketTester.assertHasListeners(true);
        serverSocketTester.assertHasListeners(true, 'datasync_bindrequest');
    });

    let onBind = [];
    it('should handle onBind', () => {
        server.onBind((socket, store, connInfo) => {
            onBind = [socket, store, connInfo];
        });
    });

    let onBindStore = [];
    it('should handle bindRequest', () => {
        clientSocket.on('datasync_bindstore', (reqID, bindID) => {
            onBindStore = [reqID, bindID];
        });

        let reqID = 'coolreqqid';

        onBind = [];
        onBindStore = [];
        clientSocket.emit('datasync_bindrequest', reqID, 'nostore', {});
        expect(onBind).toEqual([]);
        expect(onBindStore).toEqual([reqID, null]);

        reqID = 'anotherreq';
        onBind = [];
        onBindStore = [];
        clientSocket.emit('datasync_bindrequest', reqID, 'store', {a: 44});
        expect(onBind[0]).toBe(serverSocket);
        expect(onBind[1]).toBe(server.getStore('store'));
        expect(onBind[2]).toEqual({a: 44});
        expect(onBindStore[0]).toBe(reqID);
        expect(onBindStore[1].length).toBe(10);
    });

    it('should handle removeSocket', () => {
        serverSocketTester.assertHasListeners(true);

        server.removeSocket(serverSocket);

        serverSocketTester.assertHasListeners(false);
    });

    it('should footer', () => {
        global.Promise = oldpromise;
    });
});