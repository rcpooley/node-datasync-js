import {UserRoute} from "./types";
import {DataSocket} from "./datasocket";
export class UserRouter {

    private userRoutes: {[storeid: string]: UserRoute};
    private globalRoutes: UserRoute[];

    constructor() {
        this.userRoutes = {};
        this.globalRoutes = [];
    }

    public addGlobalRoute(userRoute: UserRoute): void {
        this.globalRoutes.push(userRoute);
    }

    public removeGlobalRoute(userRoute: UserRoute): void {
        let idx = this.globalRoutes.indexOf(userRoute);
        if (idx >= 0) {
            this.globalRoutes.splice(idx, 1);
        }
    }

    public setUserRoute(storeid: string, userRoute: UserRoute): void {
        this.userRoutes[storeid] = userRoute;
    }

    public route(socket: DataSocket, storeID: string, connInfo: any, callback: (userID: string) => void): void {
        let proms = [];

        this.globalRoutes.forEach(route => {
            proms.push(new Promise(resolve => {
                route(socket, storeID, connInfo, userid => {
                    resolve(userid);
                });
            }));
        });

        Promise.all(proms).then(values => {
            for (let i = 0; i < values.length; i++) {
                if (values[i]) {
                    return callback(values[i]);
                }
            }

            if (this.userRoutes[storeID]) {
                this.userRoutes[storeID](socket, storeID, connInfo, userid => {
                    if (userid) {
                        return callback(userid);
                    } else {
                        return callback(socket.id);
                    }
                });
            } else {
                return callback(socket.id);
            }
        });
    }
}