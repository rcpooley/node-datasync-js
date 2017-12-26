import {DataStoreManager} from "./datastoremanager";
import {DataSocket} from "./datasocket";
import {DataUtil} from "./datautil";
import {DataStore} from "./datastore";

export class DataStoreClient extends DataStoreManager {

    private reqMap: {[reqID: string]: {
        storeID: string,
        userID: string
    }};

    private socket: DataSocket;
    private activeStoreInfo: {[storeID: string]: {[userID: string]: string}};

    constructor() {
        super();
        this.reqMap = {};
        this.activeStoreInfo = {};
    }

    private genReqID(): string {
        let valid, reqID;

        do {
            reqID = DataUtil.randomString(10);
            valid = !(reqID in this.reqMap);
        } while (!valid);

        return reqID;
    }

    private getStoreInfo(storeID: string): {[userID: string]: string} {
        if (!(storeID in this.activeStoreInfo)) {
            this.activeStoreInfo[storeID] = {};
        }
        return this.activeStoreInfo[storeID];
    }

    public setSocket(socket: DataSocket): DataStoreClient {
        this.clearSocket();

        this.socket = socket;

        this.socket.on('datasync_bindstore', (reqID: string, bindID: string) => {
            let req = this.reqMap[reqID];

            if (bindID) {
                this.getStoreInfo(req.storeID)[req.userID] = bindID;
                let store = this.stores.getStore(req.storeID, req.userID, true);
                this.binder.bindStore(socket, store, bindID);
                socket.emit('datasync_fetchall_' + bindID, '');
            }

            delete this.reqMap[reqID];
        });

        return this;
    }

    public clearSocket(): void {
        if (!this.socket) {
            return;
        }

        this.socket.emit('datasync_disconnect', '');

        this.socket.off('datasync_bindstore');

        this.binder.unbindAll(this.socket);
        this.socket = null;
    }

    public connectStore(storeID: string, userID = 'global', connInfo = {}): DataStoreClient {
        let reqID = this.genReqID();

        this.reqMap[reqID] = {
            storeID: storeID,
            userID: userID
        };

        this.socket.emit('datasync_bindrequest', reqID, storeID, connInfo);

        return this;
    }

    public disconnectStore(storeID: string, userID = 'global'): DataStoreClient {
        let userMap = this.getStoreInfo(storeID);

        if (userID in userMap) {
            this.binder.unbindStore(this.socket, userMap[userID]);
            delete userMap[userID];
        }

        return this;
    }

    public getStore(storeID: string, userID = 'global'): DataStore {
        return this.stores.getStore(storeID, userID, true);
    }
}