import { IDBPDatabase, openDB } from 'idb';
import { Entries, StorageAdapter } from '../types';

const DB_NAME = 'WebStorageHelper';
const STORE_NAME = DB_NAME + '-store';

class IndexedDB implements StorageAdapter {
    private dbPromise?: Promise<IDBPDatabase>;

    /**
     * Opens the database on first use rather than at import time, so the library can be
     * imported where `indexedDB` does not exist. A failed open is forgotten so the next
     * call retries instead of replaying the same rejection forever.
     */
    private db(): Promise<IDBPDatabase> {
        if (!this.dbPromise) {
            this.dbPromise = openDB(DB_NAME, 1, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                },
            }).catch(error => {
                this.dbPromise = undefined;
                throw error;
            });
        }
        return this.dbPromise;
    }

    async set(key: string, value: string) {
        const db = await this.db();
        const savedKey = await db.put(STORE_NAME, value, key);
        return savedKey === key;
    }

    async get(key: string) {
        const db = await this.db();
        const value: string | undefined = await db.get(STORE_NAME, key);
        return value === undefined ? null : value;
    }

    async getAll() {
        const db = await this.db();
        const store = db.transaction(STORE_NAME).objectStore(STORE_NAME);
        const [keys, values] = await Promise.all([store.getAllKeys(), store.getAll()]);
        const entries: Entries = {};
        keys.forEach((key, index) => {
            entries[String(key)] = values[index];
        });
        return entries;
    }

    async clear(key?: string) {
        try {
            const db = await this.db();
            if (key) {
                await db.delete(STORE_NAME, key);
            } else {
                await db.clear(STORE_NAME);
            }
            return true;
        } catch (error) {
            return false;
        }
    }
}

export default new IndexedDB();
