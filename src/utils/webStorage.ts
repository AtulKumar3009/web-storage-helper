import { Entries, StorageAdapter } from '../types';

/**
 * Shared adapter for the two Web Storage areas (localStorage and sessionStorage).
 *
 * The backing store is resolved lazily on each call, so importing the library in an
 * environment without a DOM does not throw. Every call is guarded, because the real
 * failure modes are a `SecurityError` on access (blocked storage) and a
 * `QuotaExceededError` on write, both of which are reported as `false` / `null`.
 */
export class WebStorageAdapter implements StorageAdapter {
    constructor(private readonly getStore: () => Storage) { }

    private withStore<R>(fallback: R, action: (store: Storage) => R): R {
        try {
            return action(this.getStore());
        } catch {
            return fallback;
        }
    }

    set(key: string, value: string) {
        return this.withStore(false, store => {
            store.setItem(key, value);
            return true;
        });
    }

    get(key: string) {
        return this.withStore<string | null>(null, store => store.getItem(key));
    }

    getAll() {
        return this.withStore<Entries>({}, store => {
            const entries: Entries = {};
            for (let i = 0; i < store.length; i++) {
                const key = store.key(i);
                if (key !== null) entries[key] = store.getItem(key) ?? '';
            }
            return entries;
        });
    }

    clear(key?: string) {
        return this.withStore(false, store => {
            if (key) {
                store.removeItem(key);
            } else {
                store.clear();
            }
            return true;
        });
    }
}
