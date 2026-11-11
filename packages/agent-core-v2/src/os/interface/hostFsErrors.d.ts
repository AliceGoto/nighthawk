import { Error2, type Error2Options } from '#/_base/errors/errors';
export declare const OsFsErrors: {
    readonly codes: {
        readonly OS_FS_NOT_FOUND: 'os.fs.not_found';
        readonly OS_FS_IS_DIRECTORY: 'os.fs.is_directory';
        readonly OS_FS_NOT_DIRECTORY: 'os.fs.not_directory';
        readonly OS_FS_ALREADY_EXISTS: 'os.fs.already_exists';
        readonly OS_FS_PERMISSION_DENIED: 'os.fs.permission_denied';
        readonly OS_FS_NOT_EMPTY: 'os.fs.not_empty';
        readonly OS_FS_DIRECTORY_TOO_LARGE: 'os.fs.directory_too_large';
        readonly OS_FS_UNAVAILABLE: 'os.fs.unavailable';
        readonly OS_FS_UNKNOWN: 'os.fs.unknown';
    };
    readonly retryable: readonly ["os.fs.unavailable", "os.fs.unknown"];
    readonly info: {
        readonly 'os.fs.not_found': {
            readonly title: 'Path not found';
            readonly retryable: false;
            readonly public: true;
        };
        readonly 'os.fs.is_directory': {
            readonly title: 'Path is a directory';
            readonly retryable: false;
            readonly public: true;
        };
        readonly 'os.fs.not_directory': {
            readonly title: 'Path is not a directory';
            readonly retryable: false;
            readonly public: true;
        };
        readonly 'os.fs.already_exists': {
            readonly title: 'Path already exists';
            readonly retryable: false;
            readonly public: true;
        };
        readonly 'os.fs.permission_denied': {
            readonly title: 'Permission denied';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Check the file permissions of the target path.';
        };
        readonly 'os.fs.not_empty': {
            readonly title: 'Directory not empty';
            readonly retryable: false;
            readonly public: true;
        };
        readonly 'os.fs.directory_too_large': {
            readonly title: 'Directory listing exceeds the supported limit';
            readonly retryable: false;
            readonly public: true;
        };
        readonly 'os.fs.unavailable': {
            readonly title: 'Filesystem unavailable';
            readonly retryable: true;
            readonly public: true;
        };
        readonly 'os.fs.unknown': {
            readonly title: 'Filesystem error';
            readonly retryable: true;
            readonly public: true;
        };
    };
};
export type HostFsErrorCode = (typeof OsFsErrors.codes)[keyof typeof OsFsErrors.codes];
export declare class HostFsError extends Error2 {
    readonly code: HostFsErrorCode;
    constructor(code: HostFsErrorCode, message: string, options?: Error2Options);
}
export declare function toHostFsError(error: unknown, ctx: {
    path: string;
    op: string;
}): HostFsError;
export declare function isHostFsNotFound(error: unknown): boolean;
export declare function isHostFsNotDirectory(error: unknown): boolean;
