import type { WireRecord } from '#/wire/record';
import { migrateV1_0ToV1_1 } from './v1.1';
import { migrateV1_1ToV1_2 } from './v1.2';
import { migrateV1_2ToV1_3 } from './v1.3';
import { migrateV1_3ToV1_4 } from './v1.4';
import { migrateV1_4ToV1_5 } from './v1.5';
export { migrateV1_0ToV1_1, migrateV1_1ToV1_2, migrateV1_2ToV1_3, migrateV1_3ToV1_4, migrateV1_4ToV1_5, };
export declare const WIRE_PROTOCOL_VERSION = "1.5";
export type WireMigrationRecord = WireRecord;
export interface WireMigration {
    readonly sourceVersion: string;
    readonly targetVersion: string;
    migrateRecord(record: WireMigrationRecord): WireMigrationRecord;
}
export declare function isNewerWireVersion(readVersion: string): boolean;
export declare function resolveWireMigrations(readVersion: string): readonly WireMigration[];
export declare function migrateWireRecord(record: WireMigrationRecord, migrations: readonly WireMigration[]): WireMigrationRecord;
export declare function migrateWireRecords(records: readonly WireMigrationRecord[], readVersion: string | undefined): WireMigrationRecord[];
export declare function applyWireMigrations(records: readonly WireMigrationRecord[], migrations: readonly WireMigration[]): WireMigrationRecord[];
