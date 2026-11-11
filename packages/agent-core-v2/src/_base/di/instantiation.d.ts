import type { SyncDescriptor, SyncDescriptor0 } from './descriptors';
import type { CascadeEngine } from './cascadeEngine';
import type { Event } from '../event';
import type { DisposableStore, IDisposable } from './lifecycle';
import type { ServiceCollection } from './serviceCollection';
export type DependencyKind = 'instance' | 'collection' | 'ref';
export declare namespace _util {
    const serviceIds: Map<string, ServiceIdentifier<any>>;
    const DI_TARGET = "$di$target";
    const DI_DEPENDENCIES = "$di$dependencies";
    interface ServiceDependency {
        readonly id: ServiceIdentifier<any>;
        readonly index: number;
        readonly kind: DependencyKind;
    }
    function getServiceDependencies(ctor: DI_TARGET_OBJ): ServiceDependency[];
    function getInstanceDependencies(ctor: DI_TARGET_OBJ): ServiceDependency[];
    interface DI_TARGET_OBJ extends Function {
        [DI_TARGET]: Function;
        [DI_DEPENDENCIES]: {
            id: ServiceIdentifier<any>;
            index: number;
            kind: DependencyKind;
        }[];
    }
}
export type BrandedService = {
    _serviceBrand: undefined;
};
export interface IConstructorSignature<T, Args extends any[] = []> {
    new <Services extends BrandedService[]>(...args: [...Args, ...Services]): T;
}
export type GetLeadingNonServiceArgs<TArgs extends any[]> = TArgs extends [] ? [] : TArgs extends [...infer TFirst, BrandedService] ? GetLeadingNonServiceArgs<TFirst> : TArgs;
export interface ServiceIdentifier<T> {
    (target: any, key: string | symbol | undefined, index: number): void;
    readonly type: T;
    toString(): string;
}
export declare function storeCustomDependency(id: ServiceIdentifier<any>, kind: DependencyKind, target: any, index: number): void;
export declare function createDecorator<T>(name: string): ServiceIdentifier<T>;
export declare function isServiceIdentifier(thing: unknown): thing is ServiceIdentifier<unknown>;
export declare function refineServiceDecorator<T1, T extends T1>(serviceIdentifier: ServiceIdentifier<T1>): ServiceIdentifier<T>;
export declare enum ScopeActivation {
    OnScopeCreated = 0,
    OnDemand = 1
}
export interface LiveRef<T> {
    readonly current: T | undefined;
    readonly onDidChange: Event<void>;
}
export declare function ref<T>(id: ServiceIdentifier<T>): (target: object, key: string | symbol | undefined, index: number) => void;
export interface ServicesAccessor {
    get<T>(id: ServiceIdentifier<T>): T;
}
export interface ProvideOptions {
    readonly activation?: 'eager' | 'ondemand';
    readonly config?: unknown;
}
export interface ProvideAllEntry<T = unknown> {
    readonly id: ServiceIdentifier<T>;
    readonly descriptor: SyncDescriptor<T>;
    readonly options?: ProvideOptions;
}
export interface ProvideHandle extends IDisposable {
    readonly uid: number;
}
export interface IInstantiationService {
    readonly _serviceBrand: undefined;
    readonly cascade: CascadeEngine;
    invokeFunction<R, TS extends any[] = []>(fn: (accessor: ServicesAccessor, ...args: TS) => R, ...args: TS): R;
    createInstance<T>(descriptor: SyncDescriptor0<T>): T;
    createInstance<Ctor extends new (...args: any[]) => unknown, R extends InstanceType<Ctor>>(ctor: Ctor, ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>): R;
    createChild(services: ServiceCollection, store?: DisposableStore): IInstantiationService;
    provide<T>(id: ServiceIdentifier<T>, instanceOrDescriptor: T | SyncDescriptor<T>, options?: ProvideOptions): ProvideHandle;
    provideAll(entries: ReadonlyArray<ProvideAllEntry>): void;
    unprovide<T>(id: ServiceIdentifier<T>): void;
    dispose(): void;
    disposeAsync(): Promise<void>;
}
export declare const IInstantiationService: ServiceIdentifier<IInstantiationService>;
export interface ServiceCollectionLike {
    set<T>(id: ServiceIdentifier<T>, instanceOrDescriptor: any): unknown;
    get<T>(id: ServiceIdentifier<T>): any;
    has(id: ServiceIdentifier<any>): boolean;
    forEach(callback: (id: ServiceIdentifier<any>, value: any) => void): void;
}
