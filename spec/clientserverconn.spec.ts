import {MyPromise} from "./mypromise";
import {DataStoreServer} from "../src/datastoreserver";
import {DataStoreClient} from "../src/datastoreclient";
import {FakeSocket} from "../src/fakesocket";
import {DataSocket} from "../src/datasocket";
import {dataSocketTester} from "./testers";
let oldpromise;

describe('client-server connection', () => {
    let server: DataStoreServer;
    let authMap: {[socketid: string]: string};

    let sockNum = 1;
    let connectClient = () => {
        let client = new DataStoreClient();
        let sockets = FakeSocket.getSockets('socket' + (sockNum++)).map(fake => DataSocket.fromSocket(fake));

        client.setSocket(sockets[0]);
        server.addSocket(sockets[1]);

        return {
            auth: userID => {
                authMap[sockets[0].id] = userID;
            },
            connect: (storeID, userID, connInfo) => {
                client.connectStore(storeID, userID, connInfo);
            },
            disconnect: (storeID, userID) => {
                client.disconnectStore(storeID, userID);
            },
            assertValue: (storeID, userID, path, value) => {
                client.getStore(storeID, userID).ref(path).value(val => {
                    expect(val).toEqual(value);
                });
            },
            updateValue: (storeID, userID, path, value) => {
                client.getStore(storeID, userID).ref(path).update(value);
            },
            deleteValue: (storeID, userID, path) => {
                client.getStore(storeID, userID).ref(path).remove();
            },
            destroy: () => {
                client.clearSocket();
                dataSocketTester(sockets[0]).assertHasListeners(false);
                dataSocketTester(sockets[1]).assertHasListeners(false);
            },
            assertConnected: (bindID, val) => {
                dataSocketTester(sockets[0]).assertHasListeners(val, 'datasync_update_' + bindID);
                dataSocketTester(sockets[1]).assertHasListeners(val, 'datasync_update_' + bindID);
            },
            active: () => {
                return (<any>client).activeStoreInfo;
            }
        };
    };

    it('should title', () => {
        console.log('\nClient-Server Connection:');
        oldpromise = global.Promise;
        global.Promise = MyPromise;
        server = new DataStoreServer();
        authMap = {};
    });

    it('should setup server', () => {
        server.serveGlobal('store', ['auth-fail', 'cancelled']).serveByUser('user', (socket, storeID, connInfo, callback) => {
            if (socket.id in authMap) {
                if (connInfo.userid) {
                    callback(connInfo.userid);
                } else {
                    callback(authMap[socket.id]);
                }
            } else {
                callback(null);
            }
        }).userRoute((socket, storeID, connInfo, callback) => {
            if (connInfo.cancel) {
                return callback('cancelled');
            }

            if (socket.id in authMap) {
                callback(null);
            } else {
                callback('auth-fail');
            }
        });

        server.getStore('store', 'cancelled').ref('/').update('cancelled');
        server.getStore('store', 'auth-fail').ref('/').update('authfail');
        server.getStore('store').ref('/init').update('initval');
    });

    it('should try unauthenticated client', () => {
        let client = connectClient();

        client.connect('store', 'a', {});
        client.assertValue('store', 'a', '/', 'authfail');
    });

    it('should try cancelled connection', () => {
        let client = connectClient();

        client.connect('store', 'a', {cancel: true});
        client.assertValue('store', 'a', '/', 'cancelled');
    });

    it('should connect and disconnect store', () => {
        let client = connectClient();

        client.auth('rando');

        client.connect('store', 'lol', {});

        let bindID = client.active()['store']['lol'];
        client.assertConnected(bindID, true);

        client.disconnect('store', 'lol');
        client.assertConnected(bindID, false);

        client.destroy();
    });

    let users = {};
    it('should connect multiple users', () => {
        for (let i = 1; i <= 3; i++) {
            let uid = 'user' + i;
            users[uid] = [];
            for (let j = 0; j < 2; j++) {
                let client = connectClient();

                client.auth(uid);

                client.connect('store', 'a', {});
                client.assertValue('store', 'a', '/init', 'initval');

                client.connect('user', 'a', {});

                users[uid].push(client);
            }
        }
    });

    it('should update values', () => {
        for (let i = 1; i <= 3; i++) {
            let uid = 'user' + i;

            for (let j = 0; j < 2; j++) {
                users[uid][j].updateValue('store', 'a', '/' + uid, uid + j + 'val');

                Object.keys(users).forEach(key => {
                    users[key].forEach(user => {
                        user.assertValue('store', 'a', '/' + uid, uid + j + 'val');
                    });
                });

                users[uid][j].updateValue('user', 'a', '/' + j, j + 'val2');

                users[uid].forEach(user => {
                    user.assertValue('user', 'a', '/' + j, j + 'val2');
                });
            }
        }
    });

    it('should delete values', () => {
        let uid = 'user1';
        let path = `/${uid}del`;

        let testAll = (path, value) => {
            Object.keys(users[uid]).forEach(key => {
                users[uid][key].assertValue('store', 'a', path, value);
            });
        };

        users[uid][0].updateValue('store', 'a', path + '/a', 'aval');
        users[uid][0].updateValue('store', 'a', path + '/b', 'bval');

        testAll(path, {a: 'aval', b: 'bval'});

        users[uid][0].updateValue('store', 'a', path + '/c', null);

        testAll(path, {a: 'aval', b: 'bval', c: null});

        users[uid][0].deleteValue('store', 'a', path + '/a');

        testAll(path, {b: 'bval', c: null});
    });

    let admins;
    it('should connect admin users', () => {
        admins = [];
        admins.push(connectClient());
        admins.push(connectClient());

        for (let i = 0; i < admins.length; i++) {
            admins[i].auth('admin' + i);

            for (let j = 1; j <= 3; j++) {
                admins[i].connect('user', 'user' + j, {userid: 'user' + j});
            }
        }
    });

    it('should update user values with admins', () => {
        for (let i = 1; i <= 3; i++) {
            let uid = 'user' + i;

            users[uid][0].updateValue('user', 'a', '/node', uid + 'val');

            admins.forEach(admin => {
                admin.assertValue('user', uid, '/node', uid + 'val');
            });
        }
    });

    it('should disconnect admins', () => {
        admins.forEach(admin => admin.destroy());
    });

    it('should update user values without admins', () => {
        for (let i = 1; i <= 3; i++) {
            let uid = 'user' + i;

            users[uid][0].updateValue('user', 'a', '/node', uid + 'val2');

            admins.forEach(admin => {
                admin.assertValue('user', uid, '/node', uid + 'val');
            });
        }
    });

    it('should disconnect users', () => {
        for (let i = 1; i <= 3; i++) {
            let uid = 'user' + i;

            for (let j = 0; j < 2; j++) {
                users[uid][j].destroy();
            }
        }
    });

    it('should footer', () => {
        global.Promise = oldpromise;
    });
});