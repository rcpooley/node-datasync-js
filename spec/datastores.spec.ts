import {DataStores} from "../src/datastores";

describe('datastores', () => {
    let stores: DataStores;

    it('should title', () => {
        console.log('\nDataStores:');
        stores = new DataStores();
    });

    it('should start empty', () => {
        expect(stores.hasStore('store')).toBe(false);
    });

    it('should fail getStore initialize=false', () => {
        try {
            stores.getStore('store', 'user', false);
            expect(false).toBe(true);
        } catch (e) {
            expect(e.message).toBe('Invalid storeid: store-user');
        }

        expect(stores.hasStore('store')).toBe(false);
    });

    it('should succeed getStore initialize=true', () => {
        stores.getStore('store', 'user', true);
        expect(stores.hasStore('store')).toBe(true);
    });

    it('should serve different stores for different users', () => {
        let user1a = stores.getStore('store', 'user1', false);
        let user1b = stores.getStore('store', 'user1', false);
        let user2a = stores.getStore('store', 'user2', false);
        let user2b = stores.getStore('store', 'user2', false);

        user1a.ref('/').update('u1a');
        user2a.ref('/').update('u2a');

        user1b.ref('/').value(val => {
            expect(val).toBe('u1a');
        });

        user2b.ref('/').value(val => {
            expect(val).toBe('u2a');
        });
    });

    it('should serve store', () => {
        expect(stores.hasStore('lol')).toBe(false);
        stores.serveStore('lol');
        expect(stores.hasStore('lol')).toBe(true);
    });
});