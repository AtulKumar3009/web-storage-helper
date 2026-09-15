import "core-js/stable/structured-clone";
import "fake-indexeddb/auto";
import storage, { configureStorage } from '../';
import { StorageType } from '../types';
import { encrypt } from '../encryption';
import IndexedDB from '../utils/indexedDB';
import Local from '../utils/local';
import { testData } from './data';

describe('Storage tests', () => {

    beforeAll(() => {
        configureStorage({ encryptionKey: 'test-key', encodeKey: true });
    })

    afterEach(() => {
        jest.restoreAllMocks();
    })

    Object.values(StorageType).forEach(storageType => {
        testData.forEach(({ type: dataType, data }) => {
            it(`should read, write and delete in ${storageType} storage data ${dataType} type correctly - plain`, async () => {
                const key = `${storageType}-${dataType}-plain`

                const saved = await storage[storageType].set(key, data)
                expect(saved).toBe(true)

                let value = await storage[storageType].get(key)
                expect(data).toEqual(value);

                const cleared = await storage[storageType].clear(key)
                expect(cleared).toBe(true)

                value = await storage[storageType].get(key)
                expect(value).toBeNull();
            });
        })
    })

    Object.values(StorageType).forEach(storageType => {
        testData.forEach(({ type: dataType, data }) => {
            it(`should read, write and delete in ${storageType} storage data ${dataType} type correctly - encrypted`, async () => {
                const key = `${storageType}-${dataType}-encrypted`

                const saved = await storage[storageType].set(key, data, true)
                expect(saved).toBe(true)

                let value = await storage[storageType].get(key, true)
                expect(data).toEqual(value);

                // The key is encoded, so a plain read must not see the entry.
                expect(await storage[storageType].get(key)).toBeNull();

                const cleared = await storage[storageType].clear(key, true)
                expect(cleared).toBe(true)

                value = await storage[storageType].get(key, true)
                expect(value).toBeNull();
            });
        })
    })

    Object.values(StorageType).forEach(storageType => {
        it(`should return null for a missing key in ${storageType} storage`, async () => {
            expect(await storage[storageType].get('does-not-exist')).toBeNull();
            expect(await storage[storageType].get('does-not-exist', true)).toBeNull();
        });
    })

    Object.values(StorageType).forEach(storageType => {
        describe(`getAll in ${storageType} storage`, () => {
            const plain = { 'plain-string': 'Hello', 'plain-object': { a: 1 }, 'plain-number': 42 };
            const secret = { 'secret-string': 'World', 'secret-array': [1, 2] };

            beforeEach(async () => {
                await storage[storageType].clear();
                for (const key of Object.keys(plain)) await storage[storageType].set(key, plain[key as keyof typeof plain]);
                for (const key of Object.keys(secret)) await storage[storageType].set(key, secret[key as keyof typeof secret], true);
            });

            afterAll(async () => {
                await storage[storageType].clear();
            });

            it('should return every entry parsed, leaving encrypted entries raw when encryption is off', async () => {
                const all = await storage[storageType].getAll();
                expect(all).toMatchObject(plain);
                expect(Object.keys(all)).toHaveLength(Object.keys(plain).length + Object.keys(secret).length);
                // encrypted entries are present under their encoded key with their ciphertext
                Object.keys(secret).forEach(key => expect(all).not.toHaveProperty(key));
            });

            it('should decode keys and decrypt values when encryption is on', async () => {
                const all = await storage[storageType].getAll(true);
                expect(all).toMatchObject(secret);
                // plain entries pass through unchanged, exactly like get(key, true) does
                expect(all).toMatchObject(plain);
            });

            it('should return an empty object when the storage is empty', async () => {
                await storage[storageType].clear();
                expect(await storage[storageType].getAll()).toEqual({});
                expect(await storage[storageType].getAll(true)).toEqual({});
            });
        });
    })

    describe('data written by 2.x', () => {
        // 2.x serialised values twice and JSON-quoted keys before encoding them.
        const legacyKey = (key: string) => encrypt(JSON.stringify(key), 'test-key', false);
        const legacyValue = (value: any) => encrypt(JSON.stringify(JSON.stringify(value)), 'test-key');

        beforeEach(() => {
            storage.local.clear();
            Local.set(legacyKey('username'), legacyValue('Atul'));
            Local.set(legacyKey('profile'), legacyValue({ age: 30 }));
        });

        afterAll(() => {
            storage.local.clear();
        });

        it('is not found under its original key', () => {
            expect(storage.local.get('username', true)).toBeNull();
        });

        it('surfaces through getAll as JSON-quoted keys and JSON-string values', () => {
            expect(storage.local.getAll(true)).toEqual({ '"username"': '"Atul"', '"profile"': '{"age":30}' });
        });

        it('can be migrated with the documented snippet', () => {
            const legacy = storage.local.getAll<string>(true);
            Object.keys(legacy)
                .filter(key => key.startsWith('"'))
                .forEach(key => {
                    storage.local.set(JSON.parse(key), JSON.parse(legacy[key]), true);
                    storage.local.clear(key, true);
                });

            expect(storage.local.get('username', true)).toBe('Atul');
            expect(storage.local.get('profile', true)).toEqual({ age: 30 });
            expect(storage.local.getAll(true)).toEqual({ username: 'Atul', profile: { age: 30 } });
        });
    });

    it('should expose the typed get generic', () => {
        storage.local.set('typed', 'value')
        const value: string | null = storage.local.get<string>('typed')
        expect(value).toBe('value')
        storage.local.clear('typed')
    });

    it('should reject instead of hanging when the IndexedDB adapter fails', async () => {
        jest.spyOn(IndexedDB, 'get').mockRejectedValueOnce(new Error('idb failed'))
        await expect(storage.indexedDB.get('any')).rejects.toThrow('idb failed')
    });

    it('should keep the first configuration', () => {
        configureStorage({ encryptionKey: 'other-key', encodeKey: false });
        storage.local.set('config', 'value', true)
        expect(storage.local.get('config', true)).toBe('value')
        expect(storage.local.get('config')).toBeNull() // still encoded with the first config
        storage.local.clear('config', true)
    });
});

describe('Storage configured with a different key', () => {
    it('should return null for an entry encrypted with another key', () => {
        Local.set('foreign', encrypt(JSON.stringify('secret'), 'test-key'));
        jest.isolateModules(() => {
            const fresh = require('../').default as typeof storage;
            require('../').configureStorage({ encryptionKey: 'other-key', encodeKey: false });
            expect(fresh.local.get('foreign', true)).toBeNull();
            expect(fresh.local.getAll(true)).toEqual({ foreign: null });
        });
        Local.clear('foreign');
    });
});

describe('Storage without configuration', () => {
    it('should throw for every encrypted operation when no key is configured', () => {
        jest.isolateModules(() => {
            const fresh = require('../').default as typeof storage;
            const message = 'Encryption configuration is missing.';
            expect(() => fresh.local.set('key', 'value', true)).toThrow(message);
            expect(() => fresh.local.get('key', true)).toThrow(message);
            expect(() => fresh.local.clear('key', true)).toThrow(message);
            expect(() => fresh.local.getAll(true)).toThrow(message);
            expect(fresh.local.clear()).toBe(true);
            expect(fresh.local.getAll()).toEqual({});
            expect(fresh.local.set('key', 'value')).toBe(true);
            expect(fresh.local.get('key')).toBe('value');
            expect(fresh.local.getAll()).toEqual({ key: 'value' });
            expect(fresh.local.clear()).toBe(true);
        });
    });
});
