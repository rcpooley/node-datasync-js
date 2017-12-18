import {MyTester} from "./mytester";
import {DataStoreManager} from "../src/datastoremanager";
import {DataStore} from "../src/datastore";
import {DataStores} from "../src/datastores";

describe('dataref', () => {
    it('should title', () => {
        console.log('\nDataRef:');
    });

    let store = new DataStores().getStore('store', 'global', true);

    let toRef = (...inputs) => {
        return inputs.map(path => store.ref(path));
    };

    let testRef = store.ref('/a/node');

    let formatInputs = inputs => {
        return '[inputs]';
    };

    //test path
    new MyTester(() => {
        return testRef.path();
    }).expect('/a/node').test();

    //test name
    new MyTester(() => {
        return testRef.name();
    }).expect('node').test();

    //test parent
    new MyTester(() => {
        return testRef.parent().path();
    }).expect('/a').test();

    //test hasChild
    new MyTester(obj => {
        return testRef.hasChild(obj);
    }, false, formatInputs)
        .expectWithMem(true)
        .multitest(1, ...toRef('/a/node', '/a/node/a', '/a/node/b/c'))
        .expectWithMem(false)
        .multitest(1, ...toRef('/', '/a', '/a/notnode', '/b', '/b/node'));

    //test isChildOf
    new MyTester(obj => {
        return testRef.isChildOf(obj);
    }, false, formatInputs)
        .expectWithMem(false)
        .multitest(1, ...toRef('/a/node/a', '/a/node/b/c', '/a/notnode', '/b', '/b/node'))
        .expectWithMem(true)
        .multitest(1, ...toRef('/', '/a', '/a/node'));

    //test getRelativeChildPath
    new MyTester(obj => {
        return testRef.getRelativeChildPath(obj);
    }, false, formatInputs)
        .expectWithMem('/b').test(store.ref('/a/node/b'))
        .expectWithMem('/c/boi').test(store.ref('/a/node/c/boi'))
        .expectWithMem('/').test(store.ref('/a/node'));

    //test equals
    new MyTester(obj => {
        return testRef.equals(obj);
    }, false, formatInputs)
        .expect(true).test(store.ref('/a/node'))
        .expect(false).multitest(1, ...toRef('/', '/a', '/a/node/b', '/b'));

    //test ref
    new MyTester(obj => {
        return testRef.ref(obj).path();
    })
        .expectWithMem('/a/node').test('/')
        .expectWithMem('/a/node/child').test('/child')
        .expectWithMem('/a/node/a/child').test('/a/child');

    //test value and update
    let nullRef = store.ref('/null');
    it('should work with .value (null)', () => {
        nullRef.value((value, path) => {
            expect(value).toBeNull();
            expect(path).toBe('/null');
        });
    });

    let aRef = store.ref('/aref');
    aRef.update('cool');
    it('should work with .value (aref)', () => {
        aRef.value((value, path) => {
            expect(value).toBe('cool');
            expect(path).toBe('/aref');
        });
    });

    let bRef = store.ref('/bref');
    bRef.update({yes: 'sir'});
    it('should work with .value (bref)', () => {
        bRef.value((value, path) => {
            expect(value).toEqual({yes: 'sir'});
            expect(path).toBe('/bref');
        });
        bRef.ref('/yes').value((value, path) => {
            expect(value).toBe('sir');
            expect(path).toBe('/bref/yes');
        });
    });

    //test on update
    let update = [];
    testRef.on('update', (value, path) => {
        update = [value, path];
    });

    new MyTester((path, newval) => {
        update = [];
        store.ref(path).update(newval);
        return update;
    })
        .expect([]).multitest(2,
        '/a/notnode', 'hello',
        '/b', 'goodbye')
        .expect(['newval', '/']).test('/a/node', 'newval')
        .expect([{cool: 6}, '/']).test('/a/node', {cool: 6})
        .expect([{yep: 22, cool: 6}, '/yep']).test('/a/node/yep', 22)
        .expect([{my: 'bad'}, '/']).multitest(2,
        '/', {a: {node: {my: 'bad'}}},
        '/a', {node: {my: 'bad'}},
        '/a/node', {my: 'bad'})
        .expect([null, '/']).test('/', 'haha');

    //test on update value
    let newRef = store.ref('/d/node');
    let update2 = [];
    newRef.on('updateValue', (value, path) => {
        update2 = [value, path];
    });

    new MyTester((path, newval) => {
        update2 = [];
        store.ref(path).update(newval);
        return update2;
    })
        .expect([]).multitest(2,
        '/a/notnode', 'hello',
        '/b', 'goodbye',
        '/d/node/child', 'val')
        .expect(['newval', '/']).multitest(2,
        '/d/node', 'newval',
        '/d', {node: 'newval'},
        '/', {d: {node: 'newval'}})
        .expect([null, '/']).multitest(2,
        '/', 'haha',
        '/d', 'boi',
        '/d/node', null);

    //test on update child
    let haRef = store.ref('/e/node');
    let update3 = [];
    haRef.on('updateChild', (value, path) => {
        update3 = [value, path];
    });

    new MyTester((path, newval) => {
        update3 = [];
        store.ref(path).update(newval);
        return update3;
    })
        .expect([]).multitest(2,
        '/a/notnode', 'hi',
        '/b', 'bye',
        '/e/node', 'newval',
        '/e/node', {yes: 'sir'},
        '/e', {node: {boi: true}})
        .expect([{boi: true, child: 16}, '/child']).test('/e/node/child', 16)
        .expect([]).test('/e/node', null)
        .expect([{happy: {feet: 'lol'}}, '/happy']).test('/e/node/happy', {feet: 'lol'})
        .expect([{happy: {feet: 'lol'}}, '/happy/feet']).test('/e/node/happy/feet', 'lol');

    //test on -> emitOnBind
    let heyRef = store.ref('/f/node');
    heyRef.update({sub: 'val'});
    let update4 = [], update5 = [];
    let l1 = heyRef.on('update', (value, path) => {
        update4 = [value, path];
    });
    let l2 = heyRef.on('update', (value, path) => {
        update5 = [value, path];
    }, true);
    heyRef.off(l1);
    heyRef.off(l2);

    it('should handle emitOnBind', () => {
        expect(update4).toEqual([]);
        expect(update5).toEqual([{sub: 'val'}, '/']);
    });

    //test off
    it('should handle .off', () => {
        let ref = store.ref('/g/node');
        let update6 = [];
        let l1 = ref.on('update', (value, path) => {
            update6 = [value, path];
        });
        expect(update6).toEqual([]);

        store.ref('/g/node/ha').update('boi');
        expect(update6).toEqual([{ha: 'boi'}, '/ha']);

        ref.off(l1);
        update6 = [];
        store.ref('/g/node/lol').update(6);
        expect(update6).toEqual([]);
    });

    it('should handle edge case', () => {
        store.ref('/').update(1);
        store.ref('/lol').value(value => {
            expect(value).toBeNull();
        });
    });

    it('should handle update with flag', () => {
        let ref = store.ref('/nop');
        let update = [];
        ref.on('update', (value, path, flags) => {
            update = flags;
        });
        ref.update('lol', ['a', 'b']);
        expect(update).toEqual(['a', 'b']);
    });

    it('should handle update direct', () => {
        let ref = store.ref('/ud');
        let update = null;
        ref.on('updateDirect', value => update = value);
        expect(update).toBeNull();
        ref.parent().update({ud: 'lol'})
        expect(update).toBeNull();
        ref.ref('/child').update('val');
        expect(update).toBeNull();
        ref.update('newval');
        expect(update).toBe('newval');
    });
});