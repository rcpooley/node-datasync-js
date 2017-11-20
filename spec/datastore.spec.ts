import {DataStore, DataStoreServer} from "../index";
import {Socket} from 'socket.io';

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

let lastID = 1;

class MySocket {

    static getSockets(): MySocket[] {
        let a = new MySocket();
        let b = new MySocket();
        a.sibling = b;
        b.sibling = a;
        return [a, b];
    }

    id: string;
    listeners: {[event: string]: ((data: any) => void)[]};
    sibling: MySocket;

    constructor() {
        this.id = (lastID++) + '';
        this.listeners = {};
    }

    on(event: string, callback: (data: any) => void) {
        if (!(event in this.listeners)) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit(event: string, data: any) {
        this.sibling.listeners[event].forEach(listener => {
            listener(data);
        });
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

    it('should handle simple DataStoreServer', () => {
        let serverStores = new Stores();
        let clientStores = new Stores();

        let socket = MySocket.getSockets();

        let server = new DataStoreServer((socket: Socket, storeid: string, callback: (store: DataStore) => void) => {
            callback(serverStores.getStore(storeid));
        });

        let client = new DataStoreServer((socket: Socket, storeid: string, callback: (store: DataStore) => void) => {
            callback(clientStores.getStore(storeid));
        });

        server.addSocket(socket[0]);
        client.addSocket(socket[1]);

        client.bindStore(socket[1], 'mystore');

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

        let server = new DataStoreServer((socket: Socket, storeid: string, callback: (store: DataStore) => void) => {
            callback(serverStores.getStore(storeid));
        });

        let clients = [];

        for (let i = 0; i < 5; i++) {
            let clientStores = new Stores();
            clients.push(clientStores);
            let client = new DataStoreServer((socket: Socket, storeid: string, callback: (store: DataStore) => void) => {
                callback(clientStores.getStore(storeid));
            });

            let socket = MySocket.getSockets();
            server.addSocket(socket[0]);
            client.addSocket(socket[1]);
            client.bindStore(socket[1], 'mystore');
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
});