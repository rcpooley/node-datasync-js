import {DataStore} from "../index";

describe('datastore', () => {

    it('should handle invalid fetch', () => {
        let store = new DataStore();

        let ref1 = store.ref('/node');
        ref1.update('value');

        let ref2 = store.ref('/node/value');
        expect(ref2.value()).toBeUndefined();
    });

    it('should handle root update', () => {
        let store = new DataStore();

        let refRoot = store.ref('/');
        expect(refRoot.value()).toBeUndefined();
        refRoot.update('test');
        expect(refRoot.value()).toBe('test');
        refRoot.update({a: 'b'});
        expect(refRoot.value()).toEqual({a: 'b'});
        expect(refRoot.ref('/a').value()).toBe('b');
        refRoot.update('test2');
        expect(refRoot.value()).toBe('test2');
        refRoot.update(undefined);
        expect(refRoot.value()).toBeUndefined();
    });

    it('should handle simple updates', () => {
        let store = new DataStore();

        let refA = store.ref('/nodeA');
        expect(refA.value()).toBeUndefined();

        refA.update('hello');
        expect(refA.value()).toBe('hello');

        let refB = store.ref('/nodeB/hi');
        refB.update('there');
        expect(refB.parent().value()).toEqual({hi: 'there'});

        let refC = store.ref('/nodeC');
        refC.update({bye: 4});
        expect(refC.ref('bye').value()).toBe(4);

        let refD = store.ref('/nodeD/lol');
        refD.update('help');
        let refHelp = refD.ref('help');
        refHelp.update('me');
        expect(refHelp.value()).toBe('me');
        expect(refD.value()).toEqual({help: 'me'});

        let refE = store.ref('/nodeE');
        refE.update('boi');
        let refBoi = refE.ref('boi');
        refBoi.update('me');
        expect(refBoi.value()).toBe('me');
        expect(refE.value()).toEqual({boi: 'me'});
    });

    it('should call callbacks on root update', () => {
        let store = new DataStore();

        let update = [];

        let ref = store.ref('/');
        ref.on('update', (newVal: any, path: string) => {
            update = [newVal, path];
        });

        //Test updating child
        store.ref('/a/child').update('haha');
        expect(update).toEqual([{a: {child: 'haha'}}, '/a/child']);

        //Test updating value directly with object
        ref.update({another: 'child'});
        expect(update).toEqual([{another: 'child'}, '/']);

        //Test updating value directly with string
        ref.update('boi');
        expect(update).toEqual(['boi', '/']);
    });

    it('should call callbacks on update', () => {
        let store = new DataStore();

        let update = [];

        let ref = store.ref('/nodeA');
        ref.on('update', (newVal: any, path: string) => {
            update = [newVal, path];
        });

        //Test updating child
        store.ref('/nodeA/hello').update('world');
        expect(update).toEqual([{hello: 'world'}, '/hello']);

        //Test updating value directly with object
        ref.update({hello: 'world'});
        expect(update).toEqual([{hello: 'world'}, '/']);

        //Test updating value directly with string
        ref.update('lol');
        expect(update).toEqual(['lol', '/']);
    });

    it('should call callbacks on updateChild', () => {
        let store = new DataStore();

        let update = [];

        let ref = store.ref('/nodeA');
        ref.on('updateChild', (newVal: any, path: string) => {
            update = [newVal, path];
        });

        //Test updating value directly with string
        ref.update('lol');
        expect(ref.value()).toBe('lol');
        expect(update).toEqual([]);

        //Test updating child
        store.ref('/nodeA/hello').update('world');
        expect(update).toEqual([{hello: 'world'}, '/hello']);

        //Test updating value directly with object
        update = ['fdsaasdf'];
        ref.update({goodbye: 'friend'});
        expect(update).toEqual(['fdsaasdf']);
    });

    it('should call callbacks on updateValue', () => {
        let store = new DataStore();

        let update = [];

        let ref = store.ref('/nodeA');
        ref.on('updateValue', (newVal: any, path: string) => {
            update = [newVal, path];
        });

        //Test updating child
        store.ref('/nodeA/hello').update('world');
        expect(ref.value()).toEqual({hello: 'world'});
        expect(update).toEqual([]);

        //Test updating value directly with string
        ref.update('lol');
        expect(ref.value()).toBe('lol');
        expect(update).toEqual(['lol', '/']);

        //Test updating value directly with object
        ref.update({goodbye: 'friend'});
        expect(update).toEqual([{goodbye: 'friend'}, '/']);
    });
});