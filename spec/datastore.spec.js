"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var index_1 = require("../index");
var events = require("events");
var Stores = /** @class */ (function () {
    function Stores() {
        this.stores = {};
    }
    Stores.prototype.getStore = function (storeid) {
        if (!(storeid in this.stores)) {
            this.stores[storeid] = new index_1.DataStore();
        }
        return this.stores[storeid];
    };
    return Stores;
}());
var MySocket = /** @class */ (function (_super) {
    __extends(MySocket, _super);
    function MySocket() {
        return _super.call(this) || this;
    }
    return MySocket;
}(events.EventEmitter));
describe('datastore', function () {
    it('should handle invalid fetch', function () {
        var store = new index_1.DataStore();
        var ref1 = store.ref('/node');
        ref1.update('value');
        var ref2 = store.ref('/node/value');
        expect(ref2.value()).toBeUndefined();
    });
    it('should handle root update', function () {
        var store = new index_1.DataStore();
        var refRoot = store.ref('/');
        expect(refRoot.value()).toBeUndefined();
        refRoot.update('test');
        expect(refRoot.value()).toBe('test');
        refRoot.update({ a: 'b' });
        expect(refRoot.value()).toEqual({ a: 'b' });
        expect(refRoot.ref('/a').value()).toBe('b');
        refRoot.update('test2');
        expect(refRoot.value()).toBe('test2');
        refRoot.update(undefined);
        expect(refRoot.value()).toBeUndefined();
    });
    it('should handle simple updates', function () {
        var store = new index_1.DataStore();
        var refA = store.ref('/nodeA');
        expect(refA.value()).toBeUndefined();
        refA.update('hello');
        expect(refA.value()).toBe('hello');
        var refB = store.ref('/nodeB/hi');
        refB.update('there');
        expect(refB.parent().value()).toEqual({ hi: 'there' });
        var refC = store.ref('/nodeC');
        refC.update({ bye: 4 });
        expect(refC.ref('bye').value()).toBe(4);
        var refD = store.ref('/nodeD/lol');
        refD.update('help');
        var refHelp = refD.ref('help');
        refHelp.update('me');
        expect(refHelp.value()).toBe('me');
        expect(refD.value()).toEqual({ help: 'me' });
        var refE = store.ref('/nodeE');
        refE.update('boi');
        var refBoi = refE.ref('boi');
        refBoi.update('me');
        expect(refBoi.value()).toBe('me');
        expect(refE.value()).toEqual({ boi: 'me' });
    });
    it('should call callbacks on root update', function () {
        var store = new index_1.DataStore();
        var update = [];
        var ref = store.ref('/');
        ref.on('update', function (newVal, path) {
            update = [newVal, path];
        });
        //Test updating child
        store.ref('/a/child').update('haha');
        expect(update).toEqual([{ a: { child: 'haha' } }, '/a/child']);
        //Test updating value directly with object
        ref.update({ another: 'child' });
        expect(update).toEqual([{ another: 'child' }, '/']);
        //Test updating value directly with string
        ref.update('boi');
        expect(update).toEqual(['boi', '/']);
    });
    it('should call callbacks on update', function () {
        var store = new index_1.DataStore();
        var update = [];
        var ref = store.ref('/nodeA');
        ref.on('update', function (newVal, path) {
            update = [newVal, path];
        });
        //Test updating child
        store.ref('/nodeA/hello').update('world');
        expect(update).toEqual([{ hello: 'world' }, '/hello']);
        //Test updating value directly with object
        ref.update({ hello: 'world' });
        expect(update).toEqual([{ hello: 'world' }, '/']);
        //Test updating value directly with string
        ref.update('lol');
        expect(update).toEqual(['lol', '/']);
    });
    it('should call callbacks on updateChild', function () {
        var store = new index_1.DataStore();
        var update = [];
        var ref = store.ref('/nodeA');
        ref.on('updateChild', function (newVal, path) {
            update = [newVal, path];
        });
        //Test updating value directly with string
        ref.update('lol');
        expect(ref.value()).toBe('lol');
        expect(update).toEqual([]);
        //Test updating child
        store.ref('/nodeA/hello').update('world');
        expect(update).toEqual([{ hello: 'world' }, '/hello']);
        //Test updating value directly with object
        update = ['fdsaasdf'];
        ref.update({ goodbye: 'friend' });
        expect(update).toEqual(['fdsaasdf']);
    });
    it('should call callbacks on updateValue', function () {
        var store = new index_1.DataStore();
        var update = [];
        var ref = store.ref('/nodeA');
        ref.on('updateValue', function (newVal, path) {
            update = [newVal, path];
        });
        //Test updating child
        store.ref('/nodeA/hello').update('world');
        expect(ref.value()).toEqual({ hello: 'world' });
        expect(update).toEqual([]);
        //Test updating value directly with string
        ref.update('lol');
        expect(ref.value()).toBe('lol');
        expect(update).toEqual(['lol', '/']);
        //Test updating value directly with object
        ref.update({ goodbye: 'friend' });
        expect(update).toEqual([{ goodbye: 'friend' }, '/']);
    });
    it('should handle simple DataStoreServer', function () {
        var serverStores = new Stores();
        var clientStores = new Stores();
        var socket = new MySocket();
        var server = new index_1.DataStoreServer(function (socket, storeid, callback) {
            callback(serverStores.getStore(storeid));
        });
        var client = new index_1.DataStoreServer(function (socket, storeid, callback) {
            callback(clientStores.getStore(storeid));
        });
        server.addSocket(socket);
        client.addSocket(socket);
        client.bindStore(socket, 'mystore');
        var serverStore = serverStores.getStore('mystore');
        var clientStore = clientStores.getStore('mystore');
        clientStore.ref('/hello').update('there');
        expect(serverStore.ref('/hello').value()).toBe('there');
        serverStore.ref('/goodbye').update('friend');
        expect(clientStore.ref('/goodbye').value()).toBe('friend');
        var update = [];
        clientStore.ref('/updateme').on('update', function (newVal, path) {
            update = [newVal, path];
        });
        serverStore.ref('/updateme/anode').update('lol');
        expect(update).toEqual([{ anode: 'lol' }, '/anode']);
    });
});
//# sourceMappingURL=datastore.spec.js.map