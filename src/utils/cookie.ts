import { Entries, StorageAdapter } from '../types';

const EXPIRED = 'expires=Thu, 01 Jan 1970 00:00:00 UTC';

/** Parses `document.cookie` into name → raw (still URI-encoded) value. */
const parseCookies = (): Entries =>
    document.cookie.split(';').reduce<Entries>((entries, cookie) => {
        const [name, ...rest] = cookie.trim().split('=');
        if (name) entries[name] = rest.join('=');
        return entries;
    }, {});

class Cookie implements StorageAdapter {
    private isStorageAvailable(): boolean {
        try {
            // Try setting a test cookie
            document.cookie = 'test_cookie=test; path=/';
            const isAvailable = document.cookie.includes('test_cookie=test');

            // Clean up the test cookie
            document.cookie = `test_cookie=; path=/; ${EXPIRED}`;

            return isAvailable;
        } catch (error) {
            return false;
        }
    }

    set(key: string, value: string) {
        if (!this.isStorageAvailable()) return false;
        document.cookie = `${key}=${encodeURIComponent(value)}; path=/`;
        return true;
    }

    get(key: string) {
        if (!this.isStorageAvailable()) return null;
        const value = parseCookies()[key];
        return value ? decodeURIComponent(value) : null;
    }

    getAll() {
        const entries: Entries = {};
        if (!this.isStorageAvailable()) return entries;
        const raw = parseCookies();
        Object.keys(raw).forEach(name => {
            entries[name] = decodeURIComponent(raw[name]);
        });
        return entries;
    }

    clear(key?: string) {
        if (!this.isStorageAvailable()) return false;
        const names = key ? [key] : Object.keys(parseCookies());
        names.forEach(name => {
            document.cookie = `${name}=; ${EXPIRED}; path=/;`;
        });
        return true;
    }
}

export default new Cookie();
