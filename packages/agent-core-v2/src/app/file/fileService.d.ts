import type { Readable } from 'node:stream';
import { z } from 'zod';
import { type ServiceIdentifier } from '#/_base/di/instantiation';
import { Error2 } from '#/_base/errors/errors';
export declare const fileMetaSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    media_type: z.ZodString;
    size: z.ZodNumber;
    created_at: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    expires_at: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
}, z.core.$strip>;
export type FileMeta = z.infer<typeof fileMetaSchema>;
export interface SaveOptions {
    readonly name?: string;
    readonly mimeType?: string;
    readonly expiresInSec?: number;
}
export interface GetResult {
    readonly meta: FileMeta;
    readonly stream: (range?: FileReadRange) => Readable;
}
export interface FileReadRange {
    readonly start: number;
    readonly end: number;
}
export interface IFileService {
    readonly _serviceBrand: undefined;
    save(source: Readable, filename: string, options?: SaveOptions): Promise<FileMeta>;
    get(fileId: string): Promise<GetResult>;
    delete(fileId: string): Promise<void>;
}
export declare const IFileService: ServiceIdentifier<IFileService>;
export declare const FILE_ID_REGEX: RegExp;
export declare function isFileId(value: string): boolean;
export declare const FileErrors: {
    readonly codes: {
        readonly FILE_NOT_FOUND: 'file.not_found';
    };
    readonly info: {
        readonly 'file.not_found': {
            readonly title: 'File not found';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Check the file_id or upload the file again.';
        };
    };
};
export declare class FileError extends Error2 {
    constructor(code: (typeof FileErrors.codes)[keyof typeof FileErrors.codes], message: string, details?: Record<string, unknown>);
}
export declare function fileNotFoundError(fileId: string): FileError;
export declare function isFileError(error: unknown, code: (typeof FileErrors.codes)[keyof typeof FileErrors.codes]): boolean;
