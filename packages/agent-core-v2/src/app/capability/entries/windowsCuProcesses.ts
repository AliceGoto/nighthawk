import { Error2 } from '#/errors';

import { CapabilityErrors } from '../errors';
import { runCommand } from '../host';
import type { CapabilityEntryContext } from './context';

export function windowsCuProcessScript(stop: boolean): string {
  return `
$ErrorActionPreference = 'Stop'
$candidates = @($env:NIGHTHAWK_CU_WINDOWS_EXE)
if ($env:NIGHTHAWK_CU_WINDOWS_HOME) { $candidates += (Join-Path $env:NIGHTHAWK_CU_WINDOWS_HOME 'nighthawk-cu.exe') }
if ($env:LOCALAPPDATA) { $candidates += (Join-Path $env:LOCALAPPDATA 'NightHawkCU\\nighthawk-cu.exe') }
if ($env:ProgramFiles) { $candidates += (Join-Path $env:ProgramFiles 'NightHawkCU\\nighthawk-cu.exe') }
$paths = @($candidates | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { [IO.Path]::GetFullPath($_) })
$sessionId = (Get-Process -Id $PID).SessionId
$matched = @(Get-CimInstance Win32_Process -Filter "Name = 'nighthawk-cu.exe' AND SessionId = $sessionId" | Where-Object {
  $exe = $_.ExecutablePath
  if (-not $exe -or $paths -notcontains $exe) { return $false }
  $escaped = [regex]::Escape($exe)
  return $_.CommandLine -match ('^(?:"' + $escaped + '"|' + $escaped + ')\\s+(?:agent|agent-background|mcp)(?:\\s|$)')
})
${stop ? `
foreach ($candidate in $matched) {
  $process = Get-Process -Id $candidate.ProcessId -ErrorAction SilentlyContinue
  if ($null -eq $process) { continue }
  try {
    $null = $process.Handle
    if ($process.HasExited) { continue }
    if ($process.MainModule.FileName -ine $candidate.ExecutablePath) { throw 'NightHawk Computer Use process identity changed; retry installation' }
    $created = $candidate.CreationDate.ToUniversalTime()
    if ([Math]::Abs(($process.StartTime.ToUniversalTime() - $created).TotalMilliseconds) -gt 1) {
      throw 'NightHawk Computer Use process identity changed; retry installation'
    }
    $process.Kill()
    if (-not $process.WaitForExit(10000)) { throw 'NightHawk Computer Use process did not exit; retry installation' }
  } finally { $process.Dispose() }
}
` : ''}
[Console]::Out.Write($matched.Count)
`;
}

export async function manageWindowsCuProcesses(
  ctx: CapabilityEntryContext,
  powershell: string,
  stop: boolean,
): Promise<number> {
  const result = await runCommand(
    ctx.hostProcess,
    powershell,
    ['-NoProfile', '-NonInteractive', '-Command', windowsCuProcessScript(stop)],
    { timeout: ctx.commandTimeoutMs ?? 30_000 },
  );
  if (result.code !== 0 || !/^\d+$/.test(result.stdout.trim())) {
    throw new Error2(
      CapabilityErrors.codes.CAPABILITY_PROCESS_CONTROL_FAILED,
      `Failed to ${stop ? 'stop' : 'check'} NightHawk Computer Use processes: ${
        result.stderr.trim() || result.stdout.trim() || `exit code ${result.code}`
      }`,
    );
  }
  return Number(result.stdout.trim());
}

export async function findWindowsCuProcesses(
  ctx: CapabilityEntryContext,
  powershellCandidates: readonly string[],
): Promise<{ powershell: string; count: number }> {
  const failures: string[] = [];
  for (const powershell of powershellCandidates) {
    try {
      const count = await manageWindowsCuProcesses(ctx, powershell, false);
      return { powershell, count };
    } catch (error) {
      failures.push(`${powershell}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error2(
    CapabilityErrors.codes.CAPABILITY_PROCESS_CONTROL_FAILED,
    `Failed to check NightHawk Computer Use processes: ${failures.join('; ')}`,
  );
}
