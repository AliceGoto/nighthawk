import * as vscode from "vscode";

import {
  createNightHawkDeviceId,
  NIGHTHAWK_PROVIDER_NAME,
  NIGHTHAWK_REGION_PROFILES,
} from "@nighthawk/nighthawk-oauth";
import {
  NightHawkAuthFacade,
  loadRuntimeConfigSafe,
  resolveConfigPath,
  resolveNightHawkHome,
  type NightHawkConfig,
} from "@nighthawk/nighthawk-sdk";
import {
  initializeTelemetry,
  setTelemetryEnabled,
  shouldEnableTelemetry,
  shutdownTelemetry,
  track,
} from "@nighthawk/nighthawk-telemetry";

import { resolveExtensionRegion } from "./utils/region";

const SHUTDOWN_TIMEOUT_MS = 2000;

export interface ExtensionTelemetryOptions {
  readonly version: string;
  readonly log: (message: string) => void;
}

export function activateExtensionTelemetry(options: ExtensionTelemetryOptions): vscode.Disposable {
  const homeDir = resolveNightHawkHome();
  let firstLaunch = false;
  const deviceId = createNightHawkDeviceId(homeDir, {
    onFirstLaunch: () => {
      firstLaunch = true;
    },
  });
  const configPath = resolveConfigPath({ homeDir });
  const config = readTelemetryConfig(configPath);
  const auth = new NightHawkAuthFacade({ homeDir, configPath });
  const resolveRegion = () => resolveExtensionRegion({ homeDir });
  const resolution = resolveRegion();

  initializeTelemetry({
    homeDir,
    deviceId,
    enabled: config.telemetry !== false,
    initiallyEnabled: vscode.env.isTelemetryEnabled,
    appName: "nighthawk-vscode",
    version: options.version,
    uiMode: "vscode",
    model: config.defaultModel,
    region: resolution.region,
    regionSource: resolution.source,
    resolveRegion,
    endpoint: () => NIGHTHAWK_REGION_PROFILES[resolveRegion().region].telemetryEndpoint,
    getAccessToken: async () => (await auth.getCachedAccessToken(NIGHTHAWK_PROVIDER_NAME)) ?? null,
    onUnexpectedError: (error) => options.log(`Telemetry dropped a property: ${error.message}`),
  });

  const staticallyEnabled = shouldEnableTelemetry({ enabled: config.telemetry !== false });
  if (firstLaunch) track("first_launch");

  return vscode.env.onDidChangeTelemetryEnabled((enabled) => {
    if (staticallyEnabled) setTelemetryEnabled(enabled);
  });
}

export async function deactivateExtensionTelemetry(): Promise<void> {
  await shutdownTelemetry({ timeoutMs: SHUTDOWN_TIMEOUT_MS });
}

function readTelemetryConfig(
  configPath: string,
): Pick<NightHawkConfig, "telemetry" | "defaultModel"> {
  try {
    const { config, fileError } = loadRuntimeConfigSafe(configPath);
    if (fileError !== undefined) return {};
    return config;
  } catch {
    return {};
  }
}
