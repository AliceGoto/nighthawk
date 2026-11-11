export declare class AsyncEventQueue<T> implements AsyncIterable<T>, AsyncIterator<T> {
    private readonly values;
    private readonly waiters;
    private error;
    private failed;
    private ended;
    push(value: T): void;
    end(): void;
    fail(error: unknown): void;
    next(): Promise<IteratorResult<T>>;
    [Symbol.asyncIterator](): AsyncIterator<T>;
}
