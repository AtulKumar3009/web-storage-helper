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