export enum StorageType {
    LOCAL = 'local',
    SESSION = 'session',
    COOKIE = 'cookie',
    INDEXED_DB = 'indexedDB',
    TEMP = 'temp',
}

export interface StorageConfig {
    encryptionKey?: string;
    encodeKey?: boolean;
}

/**
 * Contract every adapter under `utils/` implements. Adapters store raw strings;
 * serialisation and encryption live in the `Storage` facade.
 * IndexedDB is the only asynchronous adapter, hence the promise variants.
 */
export type Entries<V = string> = Record<string, V>;

export interface StorageAdapter {
    set(key: string, value: string): boolean | Promise<boolean>;
    get(key: string): string | null | Promise<string | null>;
    getAll(): Entries | Promise<Entries>;
    clear(key?: string): boolean | Promise<boolean>;
}

export type SetReturnType<T extends StorageType> =
    T extends StorageType.INDEXED_DB ? Promise<boolean> : boolean;

export type GetReturnType<T extends StorageType, V = any> =
    T extends StorageType.INDEXED_DB ? Promise<V | null> : V | null;

export type GetAllReturnType<T extends StorageType, V = any> =
    T extends StorageType.INDEXED_DB ? Promise<Entries<V>> : Entries<V>;

export type ClearReturnType<T extends StorageType> =
    T extends StorageType.INDEXED_DB ? Promise<boolean> : boolean;
