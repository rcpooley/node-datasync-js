import {FakeSocket} from "../src/fakesocket";
import {MyTester} from "./mytester";

describe('fakesocket', () => {
    it('should title', () => {
        console.log('\nFakeSocket:');
    });

    //General setup
    let sockets = FakeSocket.getSockets('newsock');

    //Setup testers
    let printInputs = inputs => {
        let str = '';
        inputs.forEach(inp => {
            if (inp == sockets[0]) {
                str += `[socket0],`;
            } else if (inp == sockets[1]) {
                str += '[socket1],';
            } else {
                str += inp + ',';
            }
        });
        return str.substring(0, str.length - 1);
    };

    let testID = new MyTester(socket => {
        return socket.id;
    }, false, printInputs);
    testID.setTestName('testID');

    let testHasListeners = new MyTester((socket: FakeSocket, event?: string) => {
        return socket.hasListeners(event);
    }, false, printInputs);
    testHasListeners.setTestName('testHasListeners');

    let a, b;
    let testEmit = new MyTester((socket, event) => {
        a = null;
        b = null;
        socket.emit(event, true);
        return [a, b];
    }, false, printInputs);
    testEmit.setTestName('testEmit');

    let c, d;
    let testMultiEmit = new MyTester((socket, event) => {
        c = null;
        d = null;
        socket.emit(event + 'multi', 'a', 'b');
        return [c == 'ab' ? true : null, d == 'ab' ? true : null];
    }, false, printInputs);
    testMultiEmit.setTestName('testMultiEmit');

    //Setup tests
    let noListeners = (...events) => {
        events.forEach(event => {
            testHasListeners.expect(false).multitest(2,
                sockets[0], event,
                sockets[1], event);
        });
    };

    let shouldNotEmit = (...events) => {
        events.forEach(event => {
            testEmit.expect([null, null]).multitest(2,
                sockets[0], event,
                sockets[1], event);
            testMultiEmit.expect([null, null]).multitest(2,
                sockets[0], event,
                sockets[1], event);
        });
    };

    let shouldEmit = (...events) => {
        events.forEach(event => {
            testEmit.expect([true, null]).test(sockets[1], event)
                .expect([null, true]).test(sockets[0], event);
            testMultiEmit.expect([true, null]).test(sockets[1], event)
                .expect([null, true]).test(sockets[0], event);
        });
    };

    let hasListeners = (...events) => {
        events.forEach(event => {
            testHasListeners.expect(true).multitest(2,
                sockets[0], event,
                sockets[1], event);
        });
    };

    let listeners = {};
    let registerEvent = event => {
        it(`should setup event ${event}`, () => {
            let l1, l2, l3, l4;
            sockets[0].on(event, l1 = obj => a = obj);
            sockets[1].on(event, l2 = obj => b = obj);
            sockets[0].on(event + 'multi', l3 = (a, b) => c = a + b);
            sockets[1].on(event + 'multi', l4 = (a, b) => d = a + b);
            listeners[event] = [l1, l2, l3, l4];
        });
    };

    let destroyEvent = (event, useClear, useListeners) => {
        it(`should destroy event ${event}`, () => {
            if (useClear) {
                sockets[0].clearListeners();
                sockets[1].clearListeners();
            } else if (useListeners) {
                let list = listeners[event];
                delete listeners[event];
                sockets[0].off(event, list[0]);
                sockets[1].off(event, list[1]);
                sockets[0].off(event + 'multi', list[2]);
                sockets[1].off(event + 'multi', list[3]);
            } else {
                sockets[0].off(event);
                sockets[1].off(event);
                sockets[0].off(event + 'multi');
                sockets[1].off(event + 'multi');
            }
        });
    };

    let cycle = (useClear, useList, ...events) => {
        noListeners(undefined, 'never', ...events);
        shouldNotEmit('never', ...events);

        events.forEach(event => {
            registerEvent(event);
        });

        hasListeners(undefined, ...events);
        noListeners('never');

        shouldEmit(...events);
        shouldNotEmit('never');

        events.forEach(event => {
            destroyEvent(event, useClear, useList);
        });

        noListeners(undefined, 'never', ...events);
        shouldNotEmit('never', ...events);
    };

    //Start tests
    testID.expect('newsock').multitest(1, sockets[0], sockets[1]);

    [[false, true], [false, false], [true, false]].forEach(ds => {
        cycle(ds[0], ds[1], 'evt0');

        cycle(ds[0], ds[1], 'evt0', 'evt1');
    });
});