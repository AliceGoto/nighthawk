/**
 * CLI-owned data path helpers.
 *
 * These paths are for local app data such as logs and input history. Config
 * files are owned by Core/SDK and intentionally do not live behind this module.
 */

import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  NIGHTHAWK_BANNER_DIR_NAME,
  NIGHTHAWK_BANNER_STATE_FILE_NAME,
  NIGHTHAWK_BIN_DIR_NAME,
  NIGHTHAWK_CACHE_DIR_NAME,
  NIGHTHAWK_DATA_DIR_NAME,
  NIGHTHAWK_HOME_ENV,
  NIGHTHAWK_INPUT_HISTORY_DIR_NAME,
  NIGHTHAWK_LOG_DIR_NAME,
  NIGHTHAWK_MODEL_MIGRATION_STATE_FILE_NAME,
  NIGHTHAWK_NATIVE_STAGED_STATE_FILE_NAME,
  NIGHTHAWK_NATIVE_STAGING_DIR_NAME,
  NIGHTHAWK_PLUGIN_UPDATE_NOTICE_STATE_FILE_NAME,
  NIGHTHAWK_RECOMMENDED_EFFORT_STATE_FILE_NAME,
  NIGHTHAWK_UPDATE_INSTALL_LOCK_FILE_NAME,
  NIGHTHAWK_UPDATE_INSTALL_STATE_FILE_NAME,
  NIGHTHAWK_UPDATE_DIR_NAME,
  NIGHTHAWK_UPDATE_ROLLOUT_LOG_FILE_NAME,
  NIGHTHAWK_UPDATE_STATE_FILE_NAME,
} from '#/constant/app';

/**
 * Return the root data directory for NightHawk.
 *
 * Priority: `NIGHTHAWK_HOME` env var > `~/.nighthawk`.
 */
export function getDataDir(): string {
  const envDir = process.env[NIGHTHAWK_HOME_ENV];
  if (envDir) {
    return envDir;
  }
  return join(homedir(), NIGHTHAWK_DATA_DIR_NAME);
}

/**
 * Return the diagnostic log directory: `<dataDir>/logs/`.
 */
export function getLogDir(): string {
  return join(getDataDir(), NIGHTHAWK_LOG_DIR_NAME);
}

/**
 * Return the CLI cache directory: `<dataDir>/cache/`.
 */
export function getCacheDir(): string {
  return join(getDataDir(), NIGHTHAWK_CACHE_DIR_NAME);
}

/**
 * Return the managed tools directory: `<dataDir>/bin/`.
 */
export function getBinDir(): string {
  return join(getDataDir(), NIGHTHAWK_BIN_DIR_NAME);
}

/**
 * Return the update cache file: `<dataDir>/updates/latest.json`.
 */
export function getUpdateStateFile(): string {
  return join(getDataDir(), NIGHTHAWK_UPDATE_DIR_NAME, NIGHTHAWK_UPDATE_STATE_FILE_NAME);
}

/**
 * Return the update install state file: `<dataDir>/updates/install.json`.
 */
export function getUpdateInstallStateFile(): string {
  return join(getDataDir(), NIGHTHAWK_UPDATE_DIR_NAME, NIGHTHAWK_UPDATE_INSTALL_STATE_FILE_NAME);
}

/**
 * Return the update install lock file: `<dataDir>/updates/install.lock`.
 */
export function getUpdateInstallLockFile(): string {
  return join(getDataDir(), NIGHTHAWK_UPDATE_DIR_NAME, NIGHTHAWK_UPDATE_INSTALL_LOCK_FILE_NAME);
}

/**
 * Return the rollout decision log: `<dataDir>/updates/rollout.log`.
 */
export function getUpdateRolloutLogFile(): string {
  return join(getDataDir(), NIGHTHAWK_UPDATE_DIR_NAME, NIGHTHAWK_UPDATE_ROLLOUT_LOG_FILE_NAME);
}

/**
 * Return the plugin update notice state file: `<dataDir>/updates/plugin-notices.json`.
 */
export function getPluginUpdateNoticeStateFile(): string {
  return join(
    getDataDir(),
    NIGHTHAWK_UPDATE_DIR_NAME,
    NIGHTHAWK_PLUGIN_UPDATE_NOTICE_STATE_FILE_NAME,
  );
}

/**
 * Return the native staged-update directory: `<exe dir>/.staging/`.
 *
 * Anchored on the running executable (not `~/.nighthawk/bin`) because the
 * Windows installer honors `NIGHTHAWK_INSTALL_DIR`, and the swap's atomic renames
 * require the staged binary to sit on the same volume as the exe.
 */
export function getNativeStagingDir(exePath: string): string {
  return join(dirname(exePath), NIGHTHAWK_NATIVE_STAGING_DIR_NAME);
}

/**
 * Return the staged-update metadata file: `<exe dir>/.staging/staged.json`.
 */
export function getNativeStagedStateFile(exePath: string): string {
  return join(getNativeStagingDir(exePath), NIGHTHAWK_NATIVE_STAGED_STATE_FILE_NAME);
}

/**
 * Return the banner display state file: `<dataDir>/cache/banner/state.json`.
 */
export function getBannerStateFile(): string {
  return join(getCacheDir(), NIGHTHAWK_BANNER_DIR_NAME, NIGHTHAWK_BANNER_STATE_FILE_NAME);
}


export function getRecommendedEffortStateFile(): string {
  return join(getDataDir(), NIGHTHAWK_RECOMMENDED_EFFORT_STATE_FILE_NAME);
}

export function getModelMigrationStateFile(): string {
  return join(getDataDir(), NIGHTHAWK_MODEL_MIGRATION_STATE_FILE_NAME);
}

/**
 * Return the user input history file for a given working directory.
 * Layout: `<share_dir>/user-history/<md5(cwd)>.jsonl`.
 */
export function getInputHistoryFile(workDir: string): string {
  const hash = createHash('md5').update(workDir, 'utf-8').digest('hex');
  return join(getDataDir(), NIGHTHAWK_INPUT_HISTORY_DIR_NAME, `${hash}.jsonl`);
}
