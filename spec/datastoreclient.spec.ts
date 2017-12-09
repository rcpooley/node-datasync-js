import {DataStoreServer} from "../src/datastoreserver";
import {DataStoreClient} from "../src/datastoreclient";
import {DataSocket} from "../src/datasocket";
import {FakeSocket} from "../src/fakesocket";
import {MyTester} from "./mytester";

describe('datastoreclient', () => {
    it('should title', () => {
        console.log('\nDataStoreClient:');
    });

    //General setup
    let sockets: DataSocket[] = FakeSocket.getSockets('mysock').map(fake => DataSocket.fromSocket(fake));

    let server = new DataStoreServer();
    server.serveGlobal('store').serveByUser('user');

    let client = new DataStoreClient();
    client.serveGlobal('store').serveGlobal('user');

    let serverStore = server.getStore('store');
    let serverUser = server.getStore('user', sockets[0].id);
    let clientStore = client.getStore('store');
    let clientUser = client.getStore('user');

    let getStoreValues = path => {
        let valA = null, valB = null;
        serverStore.ref(path).value(value => valA = value);
        clientStore.ref(path).value(value => valB = value);
        return [valA, valB];
    };

    let getUserValues = path => {
        let valA = null, valB = null;
        serverUser.ref(path).value(value => valA = value);
        clientUser.ref(path).value(value => valB = value);
        return [valA, valB];
    };

    //Setup testers
    let testBothStore = new MyTester(path => {
        return getStoreValues(path);
    });

    let testBothUser = new MyTester(path => {
        return getUserValues(path);
    });

    let testUpdate = new MyTester((store, path, val) => {
        store.ref(path).update(val);
        let values;
        if (store == serverStore || store == clientStore) {
            values = getStoreValues(path);
        } else {
            values = getUserValues(path);
        }
        return values[0] == values[1] && values[1] == val;
    }, false, inps => {
        return `[store],${inps[1]},${inps[2]}`;
    });

    let testListeners = new MyTester((socket: DataSocket) => {
        return socket.tag.hasListeners();
    }, false, inputs => {
        if (inputs[0] == sockets[0]) {
            return '[serverSocket]';
        } else {
            return '[clientSocket]';
        }
    });

    //Setup tests
    let notConnected = () => {
        it('should update values', () => {
            serverStore.ref('/nc').update('a');
            clientStore.ref('/nc').update('b');
            serverUser.ref('/nc').update('c');
            clientUser.ref('/nc').update('d');
        });

        testBothStore.expect(['a', 'b']).test('/nc');
        testBothUser.expect(['c', 'd']).test('/nc');

        testListeners.expect(false).multitest(1, sockets[0], sockets[1]);
    };

    let isConnected = () => {
        testListeners.expect(true).multitest(1, sockets[0], sockets[1]);

        testUpdate.expect(true).multitest(3,
            serverStore, '/isc', 'newval',
            clientStore, '/isc', 'newerval',
            serverUser, '/isc', 300,
            clientUser, '/isc', 400);
    };

    let initConnection = () => {
        it('should bind and connect', () => {
            serverStore.ref('/ic').update('a');
            clientStore.ref('/ic').update('b');
            serverUser.ref('/ic').update('c');
            clientUser.ref('/ic').update('d');

            server.addSocket(sockets[0]);
            client.setSocket(sockets[1]);
        });

        testBothStore.expect(['a', 'a']).test('/ic');
        testBothUser.expect(['c', 'c']).test('/ic');
    };

    let destroyConnection = () => {
        it('should remove server socket', () => {
            server.removeSocket(sockets[0]);
        });

        testListeners.expect(false).test(sockets[0])
            .expect(true).test(sockets[1]);

        it('should remove client socket', () => {
            client.clearSocket();
        });

        testListeners.expect(false).multitest(1, sockets[0], sockets[1]);
    };

    //Start tests
    notConnected();

    initConnection();

    isConnected();

    destroyConnection();

    notConnected();
});