import {DataSocket} from "./datasocket";
import {DataStoreManager} from "./datastoremanager";
import {OnBindCallback, UserRoute} from "./types";
import {UserRouter} from "./userrouter";
import {DataStore} from "./datastore";

export class DataStoreServer extends DataStoreManager {

    private router: UserRouter;
    private globalStoreIDs: {[storeID: string]: string[]};
    private onBindCallbacks: OnBindCallback[];

    constructor() {
        super();
        this.router = new UserRouter();
        this.globalStoreIDs = {};
        this.onBindCallbacks = [];
    }

    public serveGlobal(storeid: string, forceUserIDs = []): DataStoreServer {
        this.globalStoreIDs[storeid] = forceUserIDs;
        return this.serveByUser(storeid, (socket, storeid, connInfo, callback) => {
            callback('global');
        });
    }

    public serveByUser(storeid: string, userRoute?: UserRoute): DataStoreServer {
        this.stores.serveStore(storeid);
        this.router.setUserRoute(storeid, userRoute);
        return this;
    }

    public userRoute(userRoute: UserRoute): DataStoreServer {
        this.router.addGlobalRoute(userRoute);
        return this;
    }

    public addSocket(socket: DataSocket): void {
        socket.on('datasync_bindrequest', (reqID: string, storeID: string, connInfo: any) => {
            if (!connInfo) connInfo = {};

            this.router.route(socket, storeID, connInfo, userID => {
                if (!this.stores.hasStore(storeID)) {
                    return socket.emit('datasync_bindstore', reqID, null);
                }

                let store = this.stores.getStore(storeID, userID, false);
                let bindID = this.binder.getBindID(socket);
                this.binder.bindStore(socket, store, bindID);
                this.onBindCallbacks.forEach(callback => {
                    callback(socket, this.getStore(storeID, userID), connInfo);
                });

                socket.emit('datasync_bindstore', reqID, bindID);
            });
        });

        socket.on('datasync_unbindstore', bindID => {
            this.binder.unbindStore(socket, bindID);
        });

        socket.on('datasync_disconnect', () => {
            this.removeSocket(socket);
        });
    }

    public removeSocket(socket: DataSocket): void {
        socket.off('datasync_bindrequest');
        socket.off('datasync_unbindstore');
        socket.off('datasync_disconnect');

        this.binder.unbindAll(socket);
    }

    public onBind(callback: OnBindCallback) {
        this.onBindCallbacks.push(callback);
    }

    public getStore(storeID: string, userID = 'global'): DataStore {
        if (storeID in this.globalStoreIDs && this.globalStoreIDs[storeID].indexOf(userID) == -1) {
            userID = 'global';
        }

        return this.stores.getStore(storeID, userID, false);
    }
}