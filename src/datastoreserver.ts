import {DataSocket} from "./datasocket";
import {DataStoreManager} from "./datastoremanager";
import {OnBindCallback, UserRoute} from "./types";
import {UserRouter} from "./userrouter";
import {DataStore} from "./datastore";

export class DataStoreServer extends DataStoreManager {

    private router: UserRouter;
    private globalStoreIDs: string[];
    private onBindCallbacks: OnBindCallback[];

    constructor() {
        super();
        this.router = new UserRouter();
        this.globalStoreIDs = [];
        this.onBindCallbacks = [];
    }

    public serveGlobal(storeid: string): DataStoreServer {
        this.globalStoreIDs.push(storeid);
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
                    callback(socket, this.getStore(storeID, userID));
                });

                socket.emit('datasync_bindstore', reqID, bindID);
            });
        });
    }

    public removeSocket(socket: DataSocket): void {
        socket.off('datasync_bindrequest');

        this.binder.unbindAll(socket);
    }

    public onBind(callback: OnBindCallback) {
        this.onBindCallbacks.push(callback);
    }

    public getStore(storeID: string, userID = 'global'): DataStore {
        if (this.globalStoreIDs.indexOf(storeID) >= 0) {
            userID = 'global';
        }

        return this.stores.getStore(storeID, userID, false);
    }
}