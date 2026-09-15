import { decrypt, encrypt, isEncrypted } from './encryption';
import { Entries, StorageAdapter, StorageConfig, StorageType } from './types';
import Cookie from './utils/cookie';
import IndexedDB from './utils/indexedDB';
import Local from './utils/local';
import Session from './utils/session';
import Temp from './utils/temp';

const adapters: Record<StorageType, StorageAdapter> = {
    [StorageType.LOCAL]: Local,
    [StorageType.SESSION]: Session,
    [StorageType.COOKIE]: Cookie,
    [StorageType.INDEXED_DB]: IndexedDB,
    [StorageType.TEMP]: Temp,
};

/**
 * The single facade over every adapter. Owns JSON serialisation, encryption, and key
 * encoding; adapters only ever see raw strings.
 */
class Storage {
    private config: StorageConfig = {};

    /** The first configuration wins; later calls are ignored. */
    configure(config: StorageConfig) {
        if (Object.keys(this.config).length === 0) {
            this.config = config;
        }
    }

    private requireKey(): string {
        const key = this.config.encryptionKey;
        if (!key) {
            throw new Error('Encryption configuration is missing.');
        }
        return key;
    }

    /** The key an entry is stored under. Validates the configuration whenever encryption is requested. */
    private storageKey(key: string, encryption: boolean): string {
        if (!encryption) return key;
        const secret = this.requireKey();
        return this.config.encodeKey ? encrypt(key, secret, false) : key;
    }

    /**
     * Inverse of `storageKey`: the key the caller originally passed to `set`.
     * A key that was not encoded (a plain entry) is returned as is.
     */
    private originalKey(storageKey: string, encryption: boolean): string {
        if (!encryption || !this.config.encodeKey) return storageKey;
        return decrypt(storageKey, this.requireKey(), false) ?? storageKey;
    }

    private fromJson(text: string, fallback: any): any {
        try {
            return JSON.parse(text);
        } catch (error) {
            return fallback;
        }
    }

    /**
     * Turns a stored string back into a value. With encryption on, a plain entry is
     * passed through as stored, mirroring `originalKey`; an encrypted entry that does
     * not decrypt to JSON was written with another key and yields `null`.
     */
    private parse(data: string | null, encryption: boolean): any {
        if (!data) return null;
        if (encryption && isEncrypted(data)) {
            const text = decrypt(data, this.requireKey());
            return text === null ? null : this.fromJson(text, null);
        }
        return this.fromJson(data, data);
    }

    /** Applies the same key and value transformation as `get` to every stored entry. */
    private parseAll(entries: Entries, encryption: boolean): Entries<any> {
        if (encryption) this.requireKey();
        const result: Entries<any> = {};
        Object.keys(entries).forEach(storageKey => {
            result[this.originalKey(storageKey, encryption)] = this.parse(entries[storageKey], encryption);
        });
        return result;
    }

    set(type: StorageType, key: string, value: any, encryption: boolean) {
        const storageKey = this.storageKey(key, encryption);
        const json = JSON.stringify(value);
        const data = encryption ? encrypt(json, this.requireKey()) : json;
        return adapters[type].set(storageKey, data);
    }

    get(type: StorageType, key: string, encryption: boolean): any {
        const data = adapters[type].get(this.storageKey(key, encryption));
        return data instanceof Promise
            ? data.then(resolved => this.parse(resolved, encryption))
            : this.parse(data, encryption);
    }

    getAll(type: StorageType, encryption: boolean): any {
        const entries = adapters[type].getAll();
        return entries instanceof Promise
            ? entries.then(resolved => this.parseAll(resolved, encryption))
            : this.parseAll(entries, encryption);
    }

    clear(type: StorageType, encryption: boolean, key?: string) {
        return adapters[type].clear(key === undefined ? undefined : this.storageKey(key, encryption));
    }
}

export default new Storage();
