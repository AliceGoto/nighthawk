export interface Rewrite<T> {
    readonly consumed: number;
    readonly replacement: readonly T[];
}
export interface Pattern<T> {
    readonly name: string;
    rewrite(items: readonly T[], index: number): Rewrite<T> | null;
}
export declare function applyPatterns<T>(items: readonly T[], patterns: readonly Pattern<T>[]): T[];
