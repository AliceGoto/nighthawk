import { type ServiceIdentifier } from '#/_base/di/instantiation';
import { Error2, type Error2Options } from '#/_base/errors/errors';
export declare const StorageErrors: {
    readonly codes: {
        readonly STORAGE_NOT_FOUND: 'storage.not_found';
        readonly STORAGE_DECODE_FAILED: 'storage.decode_failed';
        readonly STORAGE_CORRUPTED: 'storage.corrupted';
        readonly STORAGE_IO_FAILED: 'storage.io_failed';
        readonly STORAGE_LOCKED: 'storage.locked';
        readonly STORAGE_PERMISSION_DENIED: 'storage.permission_denied';
        readonly STORAGE_DISK_FULL: 'storage.disk_full';
    };
    readonly retryable: readonly ["storage.io_failed", "storage.locked"];
    readonly info: {
        readonly 'storage.not_found': {
            readonly title: 'Stored value not found';
            readonly retryable: false;
            readonly public: true;
        };
        readonly 'storage.decode_failed': {
            readonly title: 'Stored value could not be decoded';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Inspect the stored document; it is not valid for its declared format.';
        };
        readonly 'storage.corrupted': {
            readonly title: 'Stored data is corrupted';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Inspect the backing store; the corrupted entry must be repaired or dropped.';
        };
        readonly 'storage.io_failed': {
            readonly title: 'Storage I/O failed';
            readonly retryable: true;
            readonly public: true;
        };
        readonly 'storage.locked': {
            readonly title: 'Storage is locked';
            readonly retryable: true;
            readonly public: true;
            readonly action: 'Another process holds the store; close it or retry later.';
        };
        readonly 'storage.permission_denied': {
            readonly title: 'Storage permission denied';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Check the permissions of the storage directory.';
        };
        readonly 'storage.disk_full': {
            readonly title: 'Storage disk full';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Free up disk space and retry.';
        };
    };
};
export type StorageErrorCode = (typeof StorageErrors.codes)[keyof typeof StorageErrors.codes];
export declare class StorageError extends Error2 {
    constructor(code: StorageErrorCode, message: string, options?: Error2Options);
}
export declare function isStorageError(error: unknown, code: StorageErrorCode): boolean;
export declare function toStorageIoError(error: unknown, ctx: {
    path: string;
    op: string;
}): StorageError;
export interface StorageWriteOptions {
    readonly atomic?: boolean;
    readonly signal?: AbortSignal;
}
export interface StorageAppendOptions {
    readonly durable?: boolean;
}
export interface StorageReadRange {
    readonly start: number;
    readonly end: number;
}
export interface IFileSystemStorageService {
    readonly _serviceBrand: undefined;
    read(scope: string, key: string): Promise<Uint8Array | undefined>;
    readStream(scope: string, key: string, range?: StorageReadRange): AsyncIterable<Uint8Array>;
    write(scope: string, key: string, data: Uint8Array, options?: StorageWriteOptions): Promise<void>;
    writeStream(scope: string, key: string, source: AsyncIterable<Uint8Array>, options?: StorageWriteOptions): Promise<void>;
    append(scope: string, key: string, data: Uint8Array, options?: StorageAppendOptions): Promise<void>;
    list(scope: string, prefix?: string): Promise<readonly string[]>;
    delete(scope: string, key: string): Promise<void>;
    size(scope: string, key: string): Promise<number | undefined>;
    sizeSync(scope: string, key: string): number | undefined;
    mtime(scope: string, key: string): Promise<number | undefined>;
    pathFor(scope: string, key: string): string | undefined;
    flush(): Promise<void>;
    close(): Promise<void>;
}
export declare const IFileSystemStorageService: ServiceIdentifier<IFileSystemStorageService>;
