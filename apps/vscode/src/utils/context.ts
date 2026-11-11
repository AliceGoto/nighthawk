import * as vscode from "vscode";
import type { NightHawkHarness } from "@nighthawk/nighthawk-sdk";

export async function updateLoginContext(harness: NightHawkHarness): Promise<boolean> {
  const status = await harness.auth.status();
  const loggedIn = status.providers.some((provider) => provider.hasToken);
  await vscode.commands.executeCommand("setContext", "nighthawk.isLoggedIn", loggedIn);
  return loggedIn;
}
