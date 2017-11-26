import {DataStore, DataStoreServer, DataSocket, FakeSocket} from "../index";

class Stores {
    private stores: {[storeid: string]: DataStore};

    constructor() {
        this.stores = {};
    }

    public getStore(storeid: string): DataStore {
        if (!(storeid in this.stores)) {
            this.stores[storeid] = new DataStore();
        }
        return this.stores[storeid];
    }
}

describe('datastore', () => {

    it('should handle invalid fetch', () => {
        let store = new DataStore();

        let ref1 = store.ref('/node');
        ref1.update('value');

        let ref2 = store.ref('/node/value');
        expect(ref2.value()).toBeUndefined();
    });

    it('should handle root update', () => {
        let store = new DataStore();

        let refRoot = store.ref('/');
        expect(refRoot.value()).toBeUndefined();
        refRoot.update('test');
        expect(refRoot.value()).toBe('test');
        refRoot.update({a: 'b'});
        expect(refRoot.value()).toEqual({a: 'b'});
        expect(refRoot.ref('/a').value()).toBe('b');
        refRoot.update('test2');
        expect(refRoot.value()).toBe('test2');
        refRoot.update(undefined);
        expect(refRoot.value()).toBeUndefined();
    });

    it('should handle simple updates', () => {
        let store = new DataStore();

        let refA = store.ref('/nodeA');
        expect(refA.value()).toBeUndefined();

        refA.update('hello');
        expect(refA.value()).toBe('hello');

        let refB = store.ref('/nodeB/hi');
        refB.update('there');
        expect(refB.parent().value()).toEqual({hi: 'there'});

        let refC = store.ref('/nodeC');
        refC.update({bye: 4});
        expect(refC.ref('bye').value()).toBe(4);

        let refD = store.ref('/nodeD/lol');
        refD.update('help');
        let refHelp = refD.ref('help');
        refHelp.update('me');
        expect(refHelp.value()).toBe('me');
        expect(refD.value()).toEqual({help: 'me'});

        let refE = store.ref('/nodeE');
        refE.update('boi');
        let refBoi = refE.ref('boi');
        refBoi.update('me');
        expect(refBoi.value()).toBe('me');
        expect(refE.value()).toEqual({boi: 'me'});
    });

    it('should call callbacks on root update', () => {
        let store = new DataStore();

        let update = [];

        let ref = store.ref('/');
        ref.on('update', (newVal: any, path: string) => {
            update = [newVal, path];
        });

        //Test updating child
        store.ref('/a/child').update('haha');
        expect(update).toEqual([{a: {child: 'haha'}}, '/a/child']);

        //Test updating value directly with object
        ref.update({another: 'child'});
        expect(update).toEqual([{another: 'child'}, '/']);

        //Test updating value directly with string
        ref.update('boi');
        expect(update).toEqual(['boi', '/']);
    });

    it('should call callbacks on update', () => {
        let store = new DataStore();

        let update = [];

        let ref = store.ref('/nodeA');
        ref.on('update', (newVal: any, path: string) => {
            update = [newVal, path];
        });

        //Test updating child
        store.ref('/nodeA/hello').update('world');
        expect(update).toEqual([{hello: 'world'}, '/hello']);

        //Test updating value directly with object
        ref.update({hello: 'world'});
        expect(update).toEqual([{hello: 'world'}, '/']);

        //Test updating value directly with string
        ref.update('lol');
        expect(update).toEqual(['lol', '/']);
    });

    it('should call callbacks on updateChild', () => {
        let store = new DataStore();

        let update = [];

        let ref = store.ref('/nodeA');
        ref.on('updateChild', (newVal: any, path: string) => {
            update = [newVal, path];
        });

        //Test updating value directly with string
        ref.update('lol');
        expect(ref.value()).toBe('lol');
        expect(update).toEqual([]);

        //Test updating child
        store.ref('/nodeA/hello').update('world');
        expect(update).toEqual([{hello: 'world'}, '/hello']);

        //Test updating value directly with object
        update = ['fdsaasdf'];
        ref.update({goodbye: 'friend'});
        expect(update).toEqual(['fdsaasdf']);
    });

    it('should call callbacks on updateValue', () => {
        let store = new DataStore();

        let update = [];

        let ref = store.ref('/nodeA');
        ref.on('updateValue', (newVal: any, path: string) => {
            update = [newVal, path];
        });

        //Test updating child
        store.ref('/nodeA/hello').update('world');
        expect(ref.value()).toEqual({hello: 'world'});
        expect(update).toEqual([]);

        //Test updating value directly with string
        ref.update('lol');
        expect(ref.value()).toBe('lol');
        expect(update).toEqual(['lol', '/']);

        //Test updating value directly with object
        ref.update({goodbye: 'friend'});
        expect(update).toEqual([{goodbye: 'friend'}, '/']);
    });

    it('should propagate callbacks downwards', () => {
        let store = new DataStore();

        let updateValue = [], updateChild = [], update = [];

        let ref = store.ref('/node');
        ref.on('update', (newVal: any, path: string) => {
            update = [newVal, path];
        });
        ref.on('updateChild', (newVal: any, path: string) => {
            updateChild = [newVal, path];
        });
        ref.on('updateValue', (newVal: any, path: string) => {
            updateValue = [newVal, path];
        });

        ref.ref('/test').update('hello');

        expect(update).toEqual([{test: 'hello'}, '/test']);
        expect(updateChild).toEqual([{test: 'hello'}, '/test']);
        expect(updateValue).toEqual([]);

        ref.update('boi');
        expect(update).toEqual(['boi', '/']);
        expect(updateChild).toEqual([{test: 'hello'}, '/test']);
        expect(updateValue).toEqual(['boi', '/']);

        store.ref('/').update({node: 'what'});
        expect(update).toEqual(['what', '/']);
        expect(updateChild).toEqual([{test: 'hello'}, '/test']);
        expect(updateValue).toEqual(['what', '/']);

        store.ref('/').update({node: {ha: 'lol'}});
        expect(update).toEqual([{ha: 'lol'}, '/']);
        expect(updateChild).toEqual([{test: 'hello'}, '/test']);
        expect(updateValue).toEqual([{ha: 'lol'}, '/']);
    });

    it('should call callbacks instantly with emitOnBind=true', () => {
        let store = new DataStore();

        let ref = store.ref('/node');
        ref.update('hey there');

        let update1 = [], update2 = [];

        ref.on('update', (newVal: any, path: string) => {
            update1 = [newVal, path];
        });

        ref.on('update', (newVal: any, path: string) => {
            update2 = [newVal, path];
        }, true);

        expect(update1).toEqual([]);
        expect(update2).toEqual(['hey there', '/']);

        let check = ['whoops', '/'];
        ref.update(check[0]);

        expect(update1).toEqual(check);
        expect(update2).toEqual(check);
    });

    it('should handle simple DataStoreServer', () => {
        let serverStores = new Stores();
        let clientStores = new Stores();

        let socket = FakeSocket.getSockets();

        let server = new DataStoreServer((socket: DataSocket, storeid: string, callback: (store: DataStore) => void) => {
            callback(serverStores.getStore(storeid));
        });

        let client = new DataStoreServer((socket: DataSocket, storeid: string, callback: (store: DataStore) => void) => {
            callback(clientStores.getStore(storeid));
        });

        server.addSocket(DataSocket.fromSocket(socket[0]));
        client.addSocket(DataSocket.fromSocket(socket[1]));

        client.bindStore(DataSocket.fromSocket(socket[1]), 'mystore');

        let serverStore = serverStores.getStore('mystore');
        let clientStore = clientStores.getStore('mystore');

        clientStore.ref('/hello').update('there');
        expect(serverStore.ref('/hello').value()).toBe('there');

        serverStore.ref('/goodbye').update('friend');
        expect(clientStore.ref('/goodbye').value()).toBe('friend');

        let update = [];

        clientStore.ref('/updateme').on('update', (newVal: any, path: string) => {
            update = [newVal, path];
        });

        serverStore.ref('/updateme/anode').update('lol');
        expect(update).toEqual([{anode: 'lol'}, '/anode']);
    });

    it('should handle multi-user DataStoreServer', () => {
        let serverStores = new Stores();

        let server = new DataStoreServer((socket: DataSocket, storeid: string, callback: (store: DataStore) => void) => {
            callback(serverStores.getStore(storeid));
        });

        let clients = [];

        for (let i = 0; i < 5; i++) {
            let clientStores = new Stores();
            clients.push(clientStores);
            let client = new DataStoreServer((socket: DataSocket, storeid: string, callback: (store: DataStore) => void) => {
                callback(clientStores.getStore(storeid));
            });

            let socket = FakeSocket.getSockets();
            server.addSocket(DataSocket.fromSocket(socket[0]));
            client.addSocket(DataSocket.fromSocket(socket[1]));
            client.bindStore(DataSocket.fromSocket(socket[1]), 'mystore');
        }

        let serverStore = serverStores.getStore('mystore');
        serverStore.ref('/node').update('hello');

        for (let i = 0; i < 5; i++) {
            let clientStore = clients[i].getStore('mystore');
            expect(clientStore.ref('/node').value()).toBe('hello');
        }

        clients[0].getStore('mystore').ref('/hi').update('there');

        expect(serverStore.ref('/hi').value()).toBe('there');
        for (let i = 0; i < 5; i++) {
            let clientStore = clients[i].getStore('mystore');
            expect(clientStore.ref('/hi').value()).toBe('there');
        }
    });

    it('should handle readonly DataStoreServer', () => {
        let serverStores = new Stores();
        let clientStores = new Stores();

        let socket = FakeSocket.getSockets();

        let server = new DataStoreServer((socket: DataSocket, storeid: string, callback: (store: DataStore) => void) => {
            callback(serverStores.getStore(storeid));
        });

        let client = new DataStoreServer((socket: DataSocket, storeid: string, callback: (store: DataStore) => void) => {
            callback(clientStores.getStore(storeid));
        });

        server.addSocket(DataSocket.fromSocket(socket[0]));
        client.addSocket(DataSocket.fromSocket(socket[1]));

        client.bindStore(DataSocket.fromSocket(socket[1]), 'mystore');

        let serverStore = serverStores.getStore('mystore');
        let clientStore = clientStores.getStore('mystore');

        let clientRef = clientStore.ref('/hello');
        let serverRef = serverStore.ref('/hello');

        clientRef.update('there');
        expect(clientRef.value()).toBe('there');
        expect(serverRef.value()).toBe('there');

        serverRef.readOnly();
        serverRef.update('boy');
        expect(clientRef.value()).toBe('boy');
        expect(serverRef.value()).toBe('boy');

        let update = [];
        serverRef.on('update', (newVal, path) => {
            update = [newVal, path];
        });

        clientRef.update('girl');
        expect(serverRef.value()).toBe('boy');
        expect(clientRef.value()).toBe('boy');
        expect(update).toEqual([]);

        //Now connect third DataStore to client DataStore
        let thirdStore = new DataStore();

        let newSockets = FakeSocket.getSockets();

        let third = new DataStoreServer((socket: DataSocket, storeid: string, callback: (store: DataStore) => void) => {
            callback(thirdStore);
        });
        third.addSocket(DataSocket.fromSocket(newSockets[0]));
        client.addSocket(DataSocket.fromSocket(newSockets[1]));
        third.bindStore(DataSocket.fromSocket(newSockets[0]), 'mystore');

        let thirdRef = thirdStore.ref('/hello');
        expect(thirdRef.value()).toBe('boy');

        thirdStore.ref('/check').update('mate');
        expect(clientStore.ref('/check').value()).toBe('mate');
        expect(serverStore.ref('/check').value()).toBe('mate');
        expect(thirdStore.ref('/check').value()).toBe('mate');

        thirdRef.update('santa');
        expect(serverRef.value()).toBe('boy');
        expect(clientRef.value()).toBe('boy');
        expect(thirdRef.value()).toBe('boy');

        serverStore.ref('/hello').readOnly(false);

        thirdRef.update('santa');
        expect(serverRef.value()).toBe('santa');
        expect(clientRef.value()).toBe('santa');
        expect(thirdRef.value()).toBe('santa');

        serverRef.update('clause');
        expect(serverRef.value()).toBe('clause');
        expect(clientRef.value()).toBe('clause');
        expect(thirdRef.value()).toBe('clause');

        clientRef.update('haha');
        expect(serverRef.value()).toBe('haha');
        expect(clientRef.value()).toBe('haha');
        expect(thirdRef.value()).toBe('haha');
    });

    it('should handle disconnecting sockets', () => {
        let serverStores = new Stores();
        let clientStores = new Stores();

        let socket = FakeSocket.getSockets();

        let server = new DataStoreServer((socket: DataSocket, storeid: string, callback: (store: DataStore) => void) => {
            callback(serverStores.getStore(storeid));
        });

        let client = new DataStoreServer((socket: DataSocket, storeid: string, callback: (store: DataStore) => void) => {
            callback(clientStores.getStore(storeid));
        });

        server.addSocket(DataSocket.fromSocket(socket[0]));
        client.addSocket(DataSocket.fromSocket(socket[1]));

        client.bindStore(DataSocket.fromSocket(socket[1]), 'mystore');

        let serverStore = serverStores.getStore('mystore');
        let clientStore = clientStores.getStore('mystore');

        clientStore.ref('/hello').update('there');
        expect(clientStore.ref('/hello').value()).toBe('there');
        expect(serverStore.ref('/hello').value()).toBe('there');

        serverStore.ref('/goodbye').update('friend');
        expect(clientStore.ref('/goodbye').value()).toBe('friend');
        expect(serverStore.ref('/goodbye').value()).toBe('friend');

        client.unbindStore(DataSocket.fromSocket(socket[1]), 'mystore');

        clientStore.ref('/hello').update('mister');
        expect(clientStore.ref('/hello').value()).toBe('mister');
        expect(serverStore.ref('/hello').value()).toBe('there');

        serverStore.ref('/goodbye').update('buddy');
        expect(clientStore.ref('/goodbye').value()).toBe('friend');
        expect(serverStore.ref('/goodbye').value()).toBe('buddy');

        client.bindStore(DataSocket.fromSocket(socket[1]), 'mystore');
        expect(clientStore.ref('/hello').value()).toBe('there');
        expect(serverStore.ref('/hello').value()).toBe('there');
        expect(clientStore.ref('/goodbye').value()).toBe('buddy');
        expect(serverStore.ref('/goodbye').value()).toBe('buddy');

        socket[0].disconnect();

        clientStore.ref('/node').update('woah');
        expect(clientStore.ref('/node').value()).toBe('woah');
        expect(serverStore.ref('/node').value()).toBeUndefined();

        serverStore.ref('/bnode').update('haha');
        expect(clientStore.ref('/bnode').value()).toBeUndefined();
        expect(serverStore.ref('/bnode').value()).toBe('haha');
    });
});