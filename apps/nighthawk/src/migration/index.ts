/**
 * kimi-cli → nighthawk migration: host integration surface.
 *
 * Removable glue: the first-launch detection,
 * the native pi-tui migration screen, and the session-picker `[imported]`
 * badge helper. Migration logic itself lives in
 * `@nighthawk/migration-legacy`.
 */
export { formatSessionLabel, isImportedSession, type SessionLabelInput } from './badge';
export { detectPendingMigration } from './detect-pending';
export { MIGRATE_HEADLESS_EXIT, runHeadlessMigrate } from './run-headless';
export {
  resolveLegacySourceHome,
  sameLegacyPath,
  type LegacySourceResolution,
} from './legacy-source';
export { MigrationScreenComponent, type MigrationScreenResult } from './migration-screen';
