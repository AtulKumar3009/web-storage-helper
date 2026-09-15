import { Entries, StorageAdapter } from '../types';

class Temp implements StorageAdapter {
    private readonly store = new Map<string, string>();

    set(key: string, value: string) {
        this.store.set(key, value);
        return true;
    }

    get(key: string) {
        const value = this.store.get(key);
        return value === undefined ? null : value;
    }

    getAll() {
        const entries: Entries = {};
        this.store.forEach((value, key) => {
            entries[key] = value;
        });
        return entries;
    }

    clear(key?: string) {
        if (key) {
            this.store.delete(key);
        } else {
            this.store.clear();
        }
        return true;
    }
}

export default new Temp();
