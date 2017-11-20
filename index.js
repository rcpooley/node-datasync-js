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
var events = require("events");
var DataStoreServer = /** @class */ (function () {
    function DataStoreServer(fetchStore) {
        this.fetchStore = fetchStore;
    }
    DataStoreServer.prototype.emitStore = function (socket, storeid, store, sendRoot) {
        if (sendRoot === void 0) { sendRoot = false; }
        var sendUpdate = function (path) {
            socket.emit('datasync_update', {
                storeid: storeid,
                path: path,
                value: store.ref(path).value()
            });
        };
        if (sendRoot) {
            sendUpdate('/');
        }
        store.on('update', function (update) {
            if (update.flags.indexOf('local') == -1) {
                sendUpdate(update.path);
            }
        });
    };
    DataStoreServer.prototype.addSocket = function (socket) {
        var _this = this;
        socket.on('datasync_bindstore', function (storeid) {
            _this.fetchStore(socket, storeid, function (store) {
                _this.emitStore(socket, storeid, store, true);
            });
        });
        socket.on('datasync_update', function (updateObj) {
            _this.fetchStore(socket, updateObj.storeid, function (store) {
                store.update(updateObj.path, updateObj.value, ['local']);
            });
        });
    };
    DataStoreServer.prototype.bindStore = function (socket, storeid) {
        var _this = this;
        this.fetchStore(socket, storeid, function (store) {
            socket.emit('datasync_bindstore', storeid);
            _this.emitStore(socket, storeid, store);
        });
    };
    return DataStoreServer;
}());
exports.DataStoreServer = DataStoreServer;
var DataStore = /** @class */ (function (_super) {
    __extends(DataStore, _super);
    function DataStore() {
        var _this = _super.call(this) || this;
        _this.data = undefined;
        return _this;
    }
    DataStore.formatPath = function (path) {
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        if (path.endsWith('/')) {
            path = path.substring(0, path.length - 1);
        }
        if (path == '') {
            path = '/';
        }
        return path;
    };
    DataStore.prototype.getValue = function (path, initPath) {
        if (initPath === void 0) { initPath = false; }
        var spl = path.split('/');
        if (initPath && !this.data) {
            this.data = {};
        }
        var cur = this.data;
        if (path == '/') {
            return cur;
        }
        for (var i = 1; i < spl.length; i++) {
            if (typeof cur != 'object') {
                return;
            }
            if (spl[i] in cur) {
                if (i < spl.length && initPath && typeof cur[spl[i]] != 'object') {
                    cur[spl[i]] = {};
                }
                cur = cur[spl[i]];
            }
            else if (initPath) {
                cur[spl[i]] = {};
                cur = cur[spl[i]];
            }
            else {
                return;
            }
        }
        return cur;
    };
    DataStore.prototype.ref = function (path) {
        return new DataRef(this, path);
    };
    DataStore.prototype.value = function (path, keepMem) {
        if (keepMem === void 0) { keepMem = false; }
        var node = this.getValue(path);
        if (!node) {
            return node;
        }
        if (keepMem) {
            return node;
        }
        else {
            return JSON.parse(JSON.stringify(node));
        }
    };
    DataStore.prototype.update = function (path, newVal, flags) {
        if (flags === void 0) { flags = []; }
        var ref = this.ref(path);
        if (ref.path == '/') {
            this.data = newVal;
        }
        else {
            var parent_1 = ref.parent();
            var node = this.getValue(parent_1.path, true);
            node[ref.name] = newVal;
        }
        this.emit('update', {
            path: ref.path,
            flags: flags
        });
    };
    return DataStore;
}(events.EventEmitter));
exports.DataStore = DataStore;
var DataRef = /** @class */ (function () {
    function DataRef(store, path) {
        this.store = store;
        this.path = DataStore.formatPath(path);
        var spl = this.path.split('/');
        this.name = spl[spl.length - 1];
    }
    DataRef.prototype.parent = function () {
        return this.store.ref(this.path.substring(0, this.path.length - this.name.length));
    };
    DataRef.prototype.ref = function (path) {
        var tmpPath = this.path + DataStore.formatPath(path);
        if (this.path == '/') {
            tmpPath = path;
        }
        return this.store.ref(tmpPath);
    };
    DataRef.prototype.hasChild = function (ref) {
        return ref.path.indexOf(this.path) == 0;
    };
    DataRef.prototype.isChildOf = function (ref) {
        return ref.hasChild(this);
    };
    DataRef.prototype.value = function (keepMem) {
        if (keepMem === void 0) { keepMem = false; }
        return this.store.value(this.path, keepMem);
    };
    DataRef.prototype.update = function (newVal) {
        this.store.update(this.path, newVal);
    };
    DataRef.prototype.on = function (event, callback) {
        var _this = this;
        this.store.on('update', function (obj) {
            var path = obj.path;
            var ref = _this.store.ref(path);
            if (ref.isChildOf(_this)) {
                if (event == 'updateChild' && _this.path == path) {
                    return;
                }
                if (event == 'updateValue' && _this.path != path) {
                    return;
                }
                var relPath = DataStore.formatPath(path.substring(_this.path.length));
                callback(_this.value(), relPath);
            }
        });
    };
    return DataRef;
}());
exports.DataRef = DataRef;
//# sourceMappingURL=index.js.map