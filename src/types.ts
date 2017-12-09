import {DataSocket} from "./datasocket";
import {DataStore} from "./datastore";

export type ValuePathCallback = (value: any, path: string) => void;
export type StoreUpdateCallback = (value: any, path: string, flags: string[]) => void;
export type ValidUpdateCallback = (storeid: string, socket: DataSocket, path: string, value: any) => boolean;
export type OnBindCallback = (socket: DataSocket, store: DataStore) => void;