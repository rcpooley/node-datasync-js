import {FakeSocket} from "../src/fakesocket";
import {DataSocket} from "../src/datasocket";
import {UserRouter} from "../src/userrouter";
import {MyPromise} from "./mypromise";

let oldpromise;

describe('userrouter', () => {
    let router: UserRouter;
    let socket;

    it('should title', () => {
        oldpromise = global.Promise;
        global.Promise = MyPromise;
        console.log('\nUserRouter:');
        router = new UserRouter();
        socket = FakeSocket.getSockets('coolsocket').map(fake => DataSocket.fromSocket(fake))[0];
    });

    it('should handle default route', () => {
        router.route(socket, 'store', {}, userID => {
            expect(userID).toBe('coolsocket');
        });
    });

    it('should handle global route', () => {
        let routeInfo = [];
        let returnUserID = '';
        let userRoute;
        router.addGlobalRoute(userRoute = (sock, storeID, connInfo, callback) => {
            expect(sock).toBe(socket);
            routeInfo = [storeID, connInfo];
            callback(returnUserID);
        });

        routeInfo = [];
        returnUserID = 'testid';
        router.route(socket, 'teststore', {a: 'yes'}, userID => {
            expect(userID).toBe('testid');
        });
        expect(routeInfo).toEqual(['teststore', {a: 'yes'}]);

        router.removeGlobalRoute(userRoute);
        routeInfo = [];
        router.route(socket, 'teststore2', {a: 'no'}, userID => {
            expect(userID).toBe('coolsocket');
        });
        expect(routeInfo).toEqual([]);
    });

    it('should handle user & global route', () => {
        let globalInfo = [];
        let globalReturn = null;
        router.addGlobalRoute((sock, storeID, connInfo, callback) => {
            expect(sock).toBe(socket);
            globalInfo = [storeID, connInfo];
            callback(globalReturn);
        });

        let userInfo = null;
        let userReturn = null;
        router.setUserRoute('store', (sock, storeID, connInfo, callback) => {
            expect(sock).toBe(socket);
            expect(storeID).toBe('store');
            userInfo = connInfo;
            callback(userReturn);
        });

        globalInfo = [];
        globalReturn = 'myid';
        userInfo = null;
        router.route(socket, 'store', {a: 'maybe'}, userID => {
            expect(userID).toBe('myid');
        });
        expect(globalInfo).toEqual(['store', {a: 'maybe'}]);
        expect(userInfo).toBeNull();

        globalInfo = [];
        globalReturn = null;
        userInfo = null;
        userReturn = 'hisid';
        router.route(socket, 'store', {b: 'yes'}, userID => {
            expect(userID).toBe('hisid');
        });
        expect(globalInfo).toEqual(['store', {b: 'yes'}]);
        expect(userInfo).toEqual({b: 'yes'});

        globalInfo = [];
        globalReturn = null;
        userInfo = null;
        userReturn = null;
        router.route(socket, 'store', {b: 'no'}, userID => {
            expect(userID).toBe('coolsocket');
        });
        expect(globalInfo).toEqual(['store', {b: 'no'}]);
        expect(userInfo).toEqual({b: 'no'});

        globalInfo = [];
        globalReturn = null;
        userInfo = null;
        userReturn = null;
        router.route(socket, 'teststore', {b: 'maybe'}, userID => {
            expect(userID).toBe('coolsocket');
        });
        expect(globalInfo).toEqual(['teststore', {b: 'maybe'}]);
        expect(userInfo).toBeNull();
    });

    it('should footer', () => {
        global.Promise = oldpromise;
    });
});