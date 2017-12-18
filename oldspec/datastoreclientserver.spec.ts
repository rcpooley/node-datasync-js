/*import {DataStoreServer} from "../src/datastoreserver";
import {DataSocket} from "../src/datasocket";
import {DataStoreClient} from "../src/datastoreclient";
import {FakeSocket} from "../src/fakesocket";
import {DataStore} from "../src/datastore";
import {MyPromise} from "./mypromise";

let oldPromise = global.Promise;

class TestClient {

    private flags: string[];
    public client: DataStoreClient;
    private clientSocket: DataSocket;
    private serverSocket: DataSocket;

    private storeStore: DataStore;
    private storeMyUser: DataStore;

    constructor(public userid: string,
                public socketid: string,
                private clientFuncs: any) {

        this.client = new DataStoreClient();

        this.storeStore = this.client.getStore('store', this.userid);
        this.storeMyUser = this.client.getStore('user', this.userid);

        this.reset();
    }

    public reset(): void {
        this.setFlags([this.userid, this.socketid]);

        if (this.serverSocket) {
            this.clientFuncs.removeServerSocket(this.serverSocket);
        }

        this.client.clearSocket();

        this.logout();
        this.setAdmin(false);

        let sockets: DataSocket[] = FakeSocket.getSockets(this.socketid).map(fake => DataSocket.fromSocket(fake));
        this.clientSocket = sockets[0];
        this.serverSocket = sockets[1];

        this.storeStore.ref('/').update(null);
        this.storeMyUser.ref('/').update(null);
        this.clientFuncs.getServerStore('store', this.userid).ref('/' + this.socketid).update(null);
        this.clientFuncs.getServerStore('user', this.userid).ref('/').update(null);
    }

    public setFlags(flags: string[]): void {
        this.flags = flags;
    }

    public addFlag(flag: string): void {
        this.flags.push(flag);
    }

    public hasFlags(flags: string[]): boolean {
        let ret = false;

        for (let i = 0; i < flags.length; i++) {
            let flag = flags[i];
            let not = true;
            if (flag.startsWith('!')) {
                flag = flag.substring(1);
                not = false;
            }
            if (this.flags.indexOf(flags[i]) >= 0) {
                ret = not;
            }
        }

        return ret;
    }

    public setAdmin(val: boolean): void {
        this.clientFuncs.setAdmin(this.userid, val);
    }

    private setServerStore(path, val) {
        this.clientFuncs.getServerStore('store', this.userid).ref(path).update(val);
    }

    private setServerMyUser(path, val) {
        this.clientFuncs.getServerStore('user', this.userid).ref(path).update(val);
    }

    private getUserStore(userid: string): DataStore {
        return this.client.getStore('user', userid);
    }

    private logout() {
        this.clientFuncs.setAuth(this.socketid, null);
    }

    public testOnlyValue(storeid: string, userid: string,
                         path: string, expectedValue: any,
                         assertMem = false): void {
        this.client.getStore(storeid, userid).ref(path).value(output => {
            if (expectedValue === null) {
                expect(output).toBeNull();
            } else if (expectedValue === undefined) {
                expect(output).toBeUndefined();
            } else if (assertMem) {
                expect(output).toBe(expectedValue);
            } else {
                expect(output).toEqual(expectedValue);
            }
        });
    }

    public assertValue(prefix: string, storeid: string, path: string,
                       myExpectedValue: any, userExpectedValue: any,
                       serverExpectedValue: any, notUserExpectedValue: any,
                       assertMem = false) {
        let info = `(${storeid}, ${path})`;

        it(`(${prefix}) should have my expected value ${info}`, () => {
            this.testOnlyValue(storeid, this.userid, path, myExpectedValue, assertMem);
        });

        it(`(${prefix}) should have user expected value ${info}`, () => {
            this.clientFuncs.assertValue(storeid, null, path, userExpectedValue, assertMem, [`!${this.socketid}`, this.userid]);
        });

        it(`(${prefix}) should have server expected value ${info}`, () => {
            this.clientFuncs.assertServerValue(storeid, this.userid, path, serverExpectedValue, assertMem);
        });

        it(`(${prefix}) should have not user expected value ${info}`, () => {
            this.clientFuncs.assertValue(storeid, null, path, notUserExpectedValue, assertMem, [`!${this.socketid}`, `!${this.userid}`]);
        });
    }

    public assertListeners(state) {
        it('should have listeners for [serverSocket] == ' + state, () => {
            expect(this.serverSocket.tag.hasListeners()).toBe(state);
        });
        it('should have listeners for [clientSocket] == ' + state, () => {
            expect(this.clientSocket.tag.hasListeners()).toBe(state);
        });
    }

    public assertNotConnected(): void {
        this.assertStoreUpdate('store', false, 'not connected');
        this.assertStoreUpdate('user', false, 'not connected');
        this.assertListeners(false);
    }

    public assertConnected(): void {
        this.assertStoreUpdate('store', true, 'connected');
        this.assertStoreUpdate('user', true, 'connected');
        this.assertListeners(true);
    }

    public assertStoreUpdate(storeid: string, status: boolean, prefix?: string): void {
        let storeUpdatePrefix = 'store update';
        if (prefix) {
            storeUpdatePrefix = prefix + ' -> ' + storeUpdatePrefix;
        }
        
        let path = `/${this.socketid}/storeUpdate`;

        it('should update values', () => {
            if (storeid == 'store') {
                this.setServerStore(path + '/1', 'su1');
                this.storeStore.ref(path + '/2').update('su2');
            } else if (storeid == 'user') {
                this.setServerMyUser(path + '/1', 'su1');
                this.storeMyUser.ref(path + '/2').update('su2');
            }
        });

        if (storeid == 'store') {
            if (status) {
                this.assertValue(storeUpdatePrefix, storeid, path + '/1', 'su1', 'su1', 'su1', 'su1', true);
                this.assertValue(storeUpdatePrefix, storeid, path + '/2', 'su2', 'su2', 'su2', 'su2', true);
            } else {
                this.assertValue(storeUpdatePrefix, storeid, path + '/1', null, 'su1', 'su1', 'su1', true);
                this.assertValue(storeUpdatePrefix, storeid, path + '/2', 'su2', null, null, null, true);
            }
        } else if (storeid == 'user') {
            if (status) {
                this.assertValue(storeUpdatePrefix, storeid, path + '/1', 'su1', 'su1', 'su1', null, true);
                this.assertValue(storeUpdatePrefix, storeid, path + '/2', 'su2', 'su2', 'su2', null, true);
            } else {
                this.assertValue(storeUpdatePrefix, storeid, path + '/1', null, 'su1', 'su1', null, true);
                this.assertValue(storeUpdatePrefix, storeid, path + '/2', 'su2', null, null, null, true);
            }
        }
    }

    public assertNoAuth(): void {
        it('should have no auth value', () => {
            this.testOnlyValue('user', this.userid, '/', 'noauth', true);
        });

        this.assertStoreUpdate('store', true);
        this.assertStoreUpdate('user', false);
    }

    public assertConnectToServer(assertSuccessful = true): void {
        let path = `/${this.socketid}/connectToServer`;

        it('should update values', () => {
            this.setServerStore(path, 'a');
            this.storeStore.ref(path).update('b');
            this.setServerMyUser(path, 'c');
            this.storeMyUser.ref(path).update('d');
        });

        it('should connect to server', () => {
            this.clientFuncs.addServerSocket(this.serverSocket);
            this.client.setSocket(this.clientSocket)
                .connectStore('store').connectStore('user', this.userid);
        });

        if (assertSuccessful) {
            this.assertValue('connect to server', 'store', path, 'a', 'a', 'a', 'a', true);
            this.assertValue('connect to server', 'user', path, 'c', 'c', 'c', null, true);
        }
    }

    public assertAdminUser(userid: string, shouldWork: boolean) {
        it('should connect to new store', () => {
            this.client.connectStore('user', userid, {userid: userid});

            if (shouldWork) {
                this.addFlag('admin' + userid);
            }
        });

        let store = this.getUserStore(userid);
        let path = `/${this.socketid}/adminUser`;

        if (shouldWork) {
            it('should update value', () => {
                store.ref(path).update('au');

                this.testOnlyValue('user', userid, path, 'au', true);
            });

            this.clientFuncs.assertValue('user', userid, path, 'au', true, [userid, 'admin' + userid]);
        } else {
            it('should have failed admin user', () => {
                this.testOnlyValue('user', userid, '/', 'notadmin', true);
            });
        }
    }

    public assertReset(): void {
        it('should reset', () => {
            this.reset();
        });
    }

    public assertLogin(): void {
        it('should login', () => {
            this.clientFuncs.setAuth(this.socketid, this.userid);
        });
    }

    public assertLogout(): void {
        it('should logout', () => {
            this.logout();
        });
    }
}

describe('datastoreclientserver', () => {
    it('should title', () => {
        console.log('\nDataStoreClient & DataStoreServer:');
        global.Promise = MyPromise;
    });

    //General setup
    let authMap: {[socketid: string]: string} = {};
    let adminMap: {[userid: string]: boolean} = {};

    let server: DataStoreServer = new DataStoreServer()
        .serveGlobal('store')
        .serveByUser('user', (socket: DataSocket, storeid: string, connInfo: any,
                              callback: (userid: string) => void) => {
            let isAdmin = adminMap[authMap[socket.id]];

            if (connInfo.userid) {
                if (isAdmin) {
                    return callback(connInfo.userid);
                } else {
                    return callback('__not-admin');
                }
            } else {
                return callback(authMap[socket.id]);
            }
        })
        .userRoute((socket: DataSocket, storeid: string, connInfo: any,
                    callback: (userid: string) => void) => {
            if (authMap[socket.id] && !connInfo.cancel) {
                return callback(null);
            } else {
                return callback('__no-auth');
            }
        });
    server.getStore('user', '__no-auth').ref('/').update('noauth');
    server.getStore('user', '__not-admin').ref('/').update('notadmin');

    let clients: TestClient[] = [];

    let clientFuncs: any = {
        setAuth: (socketid, val) => authMap[socketid] = val,
        setAdmin: (userid, val) => adminMap[userid] = val,
        removeServerSocket: socket => server.removeSocket(socket),
        addServerSocket: socket => server.addSocket(socket),
        getServerStore: (storeid, userid) => {
            return server.getStore(storeid, userid);
        },
        assertValue: (storeid, userid, path, value, keepMem = false, flags = []) => {
            clients.forEach(client => {
                if (!client.hasFlags(flags) && flags.length > 0) return;

                let uid = !!userid ? userid : client.userid;

                client.testOnlyValue(storeid, uid, path, value, keepMem);
            });
        },
        assertServerValue: (storeid, userid, path, expectedValue, assertMem = false) => {
            server.getStore(storeid, userid).ref(path).value(output => {
                if (expectedValue === null) {
                    expect(output).toBeNull();
                } else if (expectedValue === undefined) {
                    expect(output).toBeUndefined();
                } else if (assertMem) {
                    expect(output).toBe(expectedValue);
                } else {
                    expect(output).toEqual(expectedValue);
                }
            });
        }
    };

    let socketNum = 1;

    let createClient = (userid: string, doNoAuth = false) => {
        let client = new TestClient(userid, 'socket' + (socketNum++), clientFuncs);

        client.assertNotConnected();

        if (doNoAuth) {
            client.assertConnectToServer(false);
            client.assertNoAuth();
            client.assertReset();
            client.assertNotConnected();
        }

        client.assertLogin();
        client.assertConnectToServer(true);
        client.assertConnected();

        it('should add client to list', () => {
            clients.push(client);
        });

        return client;
    };

    let u1 = createClient('user1', true);
    /*let u2 = createClient('user2');
    createClient('user1');
    let a1 = createClient('admin1');
    a1.setAdmin(true);

    u1.assertAdminUser('admin1', false);
    a1.assertAdminUser('user1', true);
    a1.assertAdminUser('user2', true);

    it('should really work', () => {
        let user1Store = u1.client.getStore('user', 'user1');
        let user2Store = u2.client.getStore('user', 'user2');
        let aUser1Store = a1.client.getStore('user', 'user1');
        let aUser2Store = a1.client.getStore('user', 'user2');

        let stores = [[user1Store, aUser1Store], [user2Store, aUser2Store]];
        let allStores = stores[0].concat(stores[1]);

        let path = '/itshouldwork';

        let assertStores = (stores, val) => {
            stores.forEach(store => {
                store.ref(path).value(v => {
                    expect(v).toBe(val);
                });
            });
        };

        assertStores(allStores, null);

        stores[0][0].ref(path).update('a');
        assertStores(stores[0], 'a');
        assertStores(stores[1], null);

        stores[0][1].ref(path).update('b');
        assertStores(stores[0], 'b');
        assertStores(stores[1], null);

        stores[1][0].ref(path).update('c');
        assertStores(stores[0], 'b');
        assertStores(stores[1], 'c');

        stores[1][0].ref(path).update('d');
        assertStores(stores[0], 'b');
        assertStores(stores[1], 'd');
    });

    it('should footer', () => {
        global.Promise = oldPromise;
    });
});*/