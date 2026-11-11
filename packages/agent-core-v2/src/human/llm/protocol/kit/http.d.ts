export declare function headersToRecord(headers: unknown): Record<string, string> | null;
export declare function requestIdFromHeader(name: string): (headers: Readonly<Record<string, string>>) => string | undefined;
export declare function parseRetryAfterMs(headers: unknown): number | null;
