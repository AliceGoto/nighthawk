import * as vscode from "vscode";

import {
  createNightHawkRegionResolver,
  NIGHTHAWK_PROVIDER_NAME,
  type NightHawkRegionAuthRead,
  type NightHawkRegionResolution,
  type NightHawkRegionResolver,
} from "@nighthawk/nighthawk-oauth";
import { loadRuntimeConfigSafe, resolveConfigPath } from "@nighthawk/nighthawk-sdk";

export interface ExtensionRegionOptions {
  readonly homeDir: string;
  readonly refresh?: boolean;
}

export function readPersistedNightHawkOAuthRef(
  homeDir: string,
): { readonly key: string; readonly oauthHost?: string } | undefined {
  return loadRuntimeConfigSafe(resolveConfigPath({ homeDir })).config.providers?.[
    NIGHTHAWK_PROVIDER_NAME
  ]?.oauth;
}

function readAuth(homeDir: string): NightHawkRegionAuthRead {
  try {
    const result = loadRuntimeConfigSafe(resolveConfigPath({ homeDir }));
    if (result.fileError !== undefined) return { status: "unreadable" };
    const ref = result.config.providers?.[NIGHTHAWK_PROVIDER_NAME]?.oauth;
    return ref === undefined ? { status: "logged-out" } : { status: "logged-in", ref };
  } catch {
    return { status: "unreadable" };
  }
}

const resolvers = new Map<string, NightHawkRegionResolver>();

export function resolveExtensionRegion(options: ExtensionRegionOptions): NightHawkRegionResolution {
  let resolver = resolvers.get(options.homeDir);
  if (resolver === undefined) {
    resolver = createNightHawkRegionResolver({
      homeDir: options.homeDir,
      readAuth: () => readAuth(options.homeDir),
      authFilePath: resolveConfigPath({ homeDir: options.homeDir }),
      readMarker: process.env["NIGHTHAWK_REGION_MARKER"] !== "off",
      allowLocalInference: vscode.env.remoteName === undefined,
    });
    resolvers.set(options.homeDir, resolver);
  }
  return options.refresh === true ? resolver.refresh() : resolver.current();
}

export function resetExtensionRegionCache(): void {
  resolvers.clear();
}
