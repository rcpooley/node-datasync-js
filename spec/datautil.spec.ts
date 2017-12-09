import {DataUtil} from "../src/datautil";
import {MyTester} from "./mytester";

describe('datautil', () => {
    it('should title', () => {
        console.log('\nDataUtil:');
    });
});

describe('datautil.isObject', () => {
    new MyTester(obj => {
        return DataUtil.isObject(obj);
    })
        .expectWithMem(true)
        .multitest(1, {}, {a: 1}, {a: {b: true}})
        .expectWithMem(false)
        .multitest(1, [], 'a', 1, null, undefined);
});

describe('datautil.getNameFromPath', () => {
    new MyTester(obj => {
        return DataUtil.getNameFromPath(obj);
    })
        .expectWithMem('').multitest(1, '', '/')
        .expectWithMem('a').multitest(1, '/a', '/b/a', '/c/b/a');
});

describe('datautil.forceArray', () => {
    let tester = new MyTester(obj => {
        return DataUtil.forceArray(obj);
    })
        .expect([null]).test(null)
        .expect([undefined]).test(undefined);

    let test = ['a', {}, ['a'], ['b', 'c']];
    let resp = [['a'], [{}], ['a'], ['b', 'c']];

    for (let i = 0; i < test.length; i++) {
        tester.expect(resp[i]).test(test[i]);
    }
});

describe('datautil.formatPath', () => {
    new MyTester(obj => {
        return DataUtil.formatPath(obj);
    })
        .expect('/').multitest(1, '', '/')
        .expect('/hello').multitest(1, 'hello', 'hello/', '/hello', '/hello/')
        .expect('/goodbye/son').test('goodbye/son/');
});

describe('datautil.traverseObject', () => {
    new MyTester((a, b) => {
        return DataUtil.traverseObject(a, b);
    })
        .expect(null).multitest(2,
        undefined, '/',
        null, '/whatever',
        {a: 'cool'}, '/a/b')
        .expect({}).test({}, '/')
        .expectWithMem('yolo').test({a: 'yolo'}, '/a')
        .expect({b: 'cool'}).test({a: {b: 'cool'}}, '/a')
        .expectWithMem('cool').test({a: {b: 'cool'}}, '/a/b');
});

describe('datautil.traverseObjectForReference', () => {
    let tester = new MyTester((a, b) => {
        return DataUtil.traverseObjectForReference(a, b);
    })
        .expect(null).multitest(2,
            {}, '/',
            [], '/lol',
            null, '/lol',
            undefined, '/lol');

    let testObject = {
        a: {
            value: 'cool'
        },
        b: {
            sub: {
                haha: 'boi'
            }
        },
        c: 'yas'
    };

    tester
        .expectWithMem(testObject.a).test(testObject, '/a/value')
        .expectWithMem(testObject).multitest(2,
        testObject, '/a',
        testObject, '/b',
        testObject, '/c')
        .expectWithMem(testObject.b.sub).test(testObject, '/b/sub/haha');
});