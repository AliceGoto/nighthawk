import { DisposableStore, type IDisposable, type IDisposableDebugLabel } from './di/lifecycle';
export interface Event<T> {
    (listener: (e: T) => unknown, thisArg?: unknown, disposables?: IDisposable[] | DisposableStore): IDisposable;
}
interface ListenerEntry<T> {
    listener: (e: T) => unknown;
    thisArg: unknown;
}
export declare class EventSubscription implements IDisposable, IDisposableDebugLabel {
    private readonly _remove;
    readonly debugLabel: string | undefined;
    private _removed;
    constructor(debugName: string | undefined, _remove: () => void);
    dispose(): void;
}
export declare class Emitter<T> {
    readonly debugName?: string | undefined;
    protected _listeners: Set<ListenerEntry<T>> | undefined;
    private _disposed;
    private _event;
    constructor(debugName?: string | undefined);
    get event(): Event<T>;
    get listenerCount(): number;
    fire(value: T): void;
    dispose(): void;
    get isDisposed(): boolean;
}
export interface IWaitUntil {
    readonly signal: AbortSignal;
    waitUntil(thenable: Promise<unknown>): void;
}
export type IWaitUntilData<T> = Omit<T, 'waitUntil' | 'signal'>;
export declare class AsyncEmitter<T extends IWaitUntil> extends Emitter<T> {
    private _asyncDeliveryQueue?;
    fireAsyncConcurrent(data: IWaitUntilData<T>, signal: AbortSignal): Promise<void>;
    fireAsync(data: IWaitUntilData<T>, signal: AbortSignal): Promise<void>;
    private deliverAsync;
}
export declare function handleVetos(vetos: (boolean | Promise<boolean>)[], onError: (error: unknown) => void): Promise<boolean>;
export declare namespace Event {
    const None: Event<unknown>;
    function once<T>(event: Event<T>): Event<T>;
    function map<I, O>(event: Event<I>, map: (i: I) => O): Event<O>;
    function filter<T>(event: Event<T>, filter: (e: T) => boolean): Event<T>;
    function any<T>(...events: Event<T>[]): Event<T>;
}
export {};
