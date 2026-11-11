export interface TokenUsage {
    inputOther: number;
    output: number;
    inputCacheRead?: number;
    inputCacheCreation: number;
    raw?: Record<string, unknown>;
}
export declare function emptyUsage(): TokenUsage;
export declare function inputTotal(usage: TokenUsage): number | undefined;
export declare function grandTotal(usage: TokenUsage): number | undefined;
export declare function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage;
export declare function mergeUsagePatch(base: TokenUsage | undefined, patch: Partial<TokenUsage>): TokenUsage;
