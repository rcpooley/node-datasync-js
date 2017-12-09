import {DataStoreManager} from "./datastoremanager";
import {DataSocket} from "./datasocket";

export class DataStoreClient extends DataStoreManager {

    private socket: DataSocket;

    private getStoreIDs(): string[] {
        return Object.keys(this.globalStoreData).concat(Object.keys(this.userStoreData));
    }

    public setSocket(socket: DataSocket): void {
        this.clearSocket();

        this.socket = socket;
        this.getStoreIDs().forEach(storeid => {
            this.bindStore(socket, storeid);
            socket.emit('datasync_bindstore', storeid);
        });
    }

    public clearSocket(): void {
        if (this.socket) {
            this.getStoreIDs().forEach(storeid => {
                this.unbindStore(this.socket, storeid);
            });
            this.socket = null;
        }
    }
}