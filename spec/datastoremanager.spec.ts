import {DataStoreManager} from "../src/datastoremanager";
import {MyTester} from "./mytester";
import {FakeSocket} from "../src/fakesocket";
import {DataSocket} from "../src/datasocket";
import {DataStore} from "../src/datastore";

describe('datastoremanager', () => {
    it('should title', () => {
        console.log('\nDataStoreManager:');
    });
});

describe('datastoremanager.serveGlobal', () => {
    let manager = new DataStoreManager();

    manager.serveGlobal('store');

    it('should work', () => {
        let a = manager.getStore('store');
        let b = manager.getStore('store', 'a');
        let c = manager.getStore('store', 'b');

        expect(a).toBe(b);
        expect(b).toBe(c);
    });
});

describe('datastoremanager.serveByUser', () => {
    let manager = new DataStoreManager();

    manager.serveByUser('store');

    it('should work', () => {
        try {
            manager.getStore('store');
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toBe('Invalid storeid: store, undefined');
        }

        let b = manager.getStore('store', 'a');
        let c = manager.getStore('store', 'b');
        let d = manager.getStore('store', 'a');
        let e = manager.getStore('store', 'b');

        expect(b).toBe(d);
        expect(c).toBe(e);
        expect(b).not.toBe(c);
    });
});

describe('datastoremanager.getStore', () => {
    let manager = new DataStoreManager()
        .serveGlobal('store')
        .serveByUser('user');

    it('should handle invalid store', () => {
        try {
            manager.getStore('lol');
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toBe('Invalid storeid: lol, undefined');
        }

        try {
            manager.getStore('lol', 'boi');
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toBe('Invalid storeid: lol, boi');
        }

        try {
            manager.getStore('user');
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toBe('Invalid storeid: user, undefined');
        }
    });

    it('should handle valid global store', () => {
        let a = manager.getStore('store');
        let b = manager.getStore('store');
        let c = manager.getStore('store', 'a');
        expect(a).toBe(b);
        expect(b).toBe(c);
    });

    it('should handle valid user store', () => {
        let a = manager.getStore('user', 'a');
        let b = manager.getStore('user', 'a');
        let c = manager.getStore('user', 'b');
        let d = manager.getStore('user', 'b');
        expect(a).toBe(b);
        expect(c).toBe(d);
        expect(a).not.toBe(c);
    });
});

interface MyMan {
    bindStore: (socket: DataSocket, storeid: string, emitOnBind: boolean) => void;
    unbindStore: (socket: DataSocket, storeid: string) => void;
    clearStores: (socket: DataSocket) => void;
}

describe('datastoremanager.bind/unbind/clear/subscribe', () => {
    let sockets: DataSocket[] = FakeSocket.getSockets('mysock')
        .map(fake => DataSocket.fromSocket(fake));

    let managerA: any = new DataStoreManager().serveGlobal('store'),
        managerB: any = new DataStoreManager().serveGlobal('store');

    let manA: MyMan = managerA,
        manB: MyMan = managerB;

    let storeA: DataStore = managerA.getStore('store'),
        storeB: DataStore = managerB.getStore('store');

    let getValues = path => {
        let valA = null, valB = null;
        storeA.ref(path).value(value => valA = value);
        storeB.ref(path).value(value => valB = value);
        return [valA, valB];
    };

    let testBoth = new MyTester(path => {
        return getValues(path);
    });

    let testUpdate = new MyTester((store, path, val) => {
        store.ref(path).update(val);
        let values = getValues(path);
        return values[0] == values[1] && values[1] == val;
    }, false, inps => {
        return `[store],${inps[1]},${inps[2]}`;
    });

    testBoth.expect([null, null]).test('/a/node');

    it('should bind both stores', () => {
        storeA.ref('/a/node').update('val');
        manB.bindStore(sockets[1], 'store', false);
        manA.bindStore(sockets[0], 'store', true);
    });

    testBoth.expect(['val', 'val']).test('/a/node');

    testBoth.expect([null, null]).multitest(1, '/b', '/c');

    testUpdate.expect(true).multitest(3,
        storeA, '/b', 'b',
        storeB, '/c', 'c',
        storeA, '/c', null,
        storeB, '/b', null);

    it('should unbind both stores', () => {
        manA.unbindStore(sockets[0], 'store');
        manB.unbindStore(sockets[1], 'store');
        storeA.ref('/d').update('d');
        storeB.ref('/e').update('e');
    });

    testBoth.expect(['d', null]).test('/d');
    testBoth.expect([null, 'e']).test('/e');

    it('should rebind both stores', () => {
        manB.bindStore(sockets[1], 'store', false);
        manA.bindStore(sockets[0], 'store', true);
        managerA.subscribeOnUpdate((storeid, socket, path, value) => {
            return !(path == '/nope' || value == 'nope');
        });
    });

    testBoth.expect(['d', 'd']).test('/d');
    testBoth.expect([null, null]).test('/e');

    testUpdate.expect(true).multitest(3,
        storeA, '/haha', 'haha',
        storeB, '/ahah', 'ahah',
        storeA, '/nope', 'yes',
        storeA, '/yes', 'nope',
        storeA, '/test', 'test')
        .expect(false).multitest(3,
        storeB, '/nope', 'what',
        storeB, '/test', 'nope');

    testBoth.expect(['haha', 'haha']).test('/haha')
        .expect(['ahah', 'ahah']).test('/ahah')
        .expect(['yes', 'yes']).test('/nope')
        .expect(['nope', 'nope']).test('/yes')
        .expect(['test', 'test']).test('/test');

    it('should clear stores', () => {
        manA.clearStores(sockets[0]);
        manB.clearStores(sockets[1]);
        storeA.ref('/f').update('f');
        storeB.ref('/g').update('g');
    });

    testBoth.expect(['f', null]).test('/f');
    testBoth.expect([null, 'g']).test('/g');
});