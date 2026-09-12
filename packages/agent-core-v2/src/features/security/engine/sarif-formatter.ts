import { NIGHTHAWK_DEFAULT_SITE_BASE } from '@nighthawk/nighthawk-oauth';

import type { NormalizedFinding, FindingEvidence, ScanMetrics } from './engine';
import type { Severity } from './rules';

export interface SarifLog {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

export interface SarifRun {
  tool: SarifTool;
  results: SarifResult[];
  invocations?: SarifInvocation[];
}

export interface SarifTool {
  driver: {
    name: string;
    version: string;
    informationUri: string;
    rules: SarifReportingDescriptor[];
  };
}

export interface SarifReportingDescriptor {
  id: string;
  name: string;
  shortDescription?: { text: string };
  fullDescription?: { text: string };
  helpUri?: string;
  properties?: {
    tags?: string[];
    precision?: string;
    'problem.severity'?: string;
  };
}

export interface SarifResult {
  ruleId: string;
  ruleIndex: number;
  level: 'error' | 'warning' | 'note' | 'none';
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: { startLine: number; endLine?: number };
    };
  }>;
  properties?: {
    evidence?: FindingEvidence[];
    confidence?: string;
  };
}

export interface SarifInvocation {
  executionSuccessful: boolean;
  properties?: {
    metrics?: ScanMetrics;
  };
}

export interface SarifFormatterOptions {
  toolVersion?: string;
  baselineGuid?: string;
}

export function severityToLevel(severity: Severity): 'error' | 'warning' | 'note' | 'none' {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'note';
    case 'info':
      return 'none';
  }
}

export function normalizeFileUri(file: string): string {
  let normalized = file;
  if (/^[A-Za-z]:\\/.test(normalized)) {
    normalized = normalized.slice(3);
  }
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
  }
  return normalized.split('\\').join('/');
}

export interface RuleInfo {
  id: string;
  name: string;
  description?: string;
  cwe?: string;
  owasp?: string;
}

export function buildSarifRules(
  findings: NormalizedFinding[],
  allRules?: RuleInfo[],
): SarifReportingDescriptor[] {
  const ruleIds = new Set<string>();
  for (const f of findings) {
    for (const e of f.evidence) {
      if (e.ruleId !== undefined) ruleIds.add(e.ruleId);
    }
  }

  const ruleMap = new Map<string, RuleInfo>();
  if (allRules !== undefined) {
    for (const r of allRules) ruleMap.set(r.id, r);
  }

  const descriptors: SarifReportingDescriptor[] = [];
  for (const id of ruleIds) {
    const info = ruleMap.get(id);
    const tags: string[] = [];
    if (info?.cwe !== undefined) tags.push(`CWE-${info.cwe.replace(/^CWE-/, '')}`);
    if (info?.owasp !== undefined) tags.push(info.owasp);

    descriptors.push({
      id,
      name: info?.name ?? id,
      shortDescription: info?.description !== undefined
        ? { text: info.description }
        : undefined,
      properties: tags.length > 0
        ? { tags }
        : undefined,
    });
  }
  return descriptors;
}

function highestConfidence(evidence: FindingEvidence[]): string | undefined {
  let best: string | undefined;
  const rank: Record<string, number> = { high: 3, medium: 2, low: 1 };
  for (const e of evidence) {
    if (e.confidence !== undefined) {
      if (best === undefined || (rank[e.confidence] ?? 0) > (rank[best] ?? 0)) {
        best = e.confidence;
      }
    }
  }
  return best;
}

export function formatToSarif(
  findings: NormalizedFinding[],
  metrics?: ScanMetrics,
  options?: SarifFormatterOptions,
): SarifLog {
  const toolVersion = options?.toolVersion ?? '0.1.0';
  const rules = buildSarifRules(findings);
  const ruleIndexMap = new Map<string, number>();
  for (let i = 0; i < rules.length; i++) {
    ruleIndexMap.set(rules[i]!.id!, i);
  }

  const sorted = [...findings].sort((a, b) => a.file.localeCompare(b.file));

  const results: SarifResult[] = sorted.map(f => {
    const primaryRuleId = f.evidence[0]?.ruleId;
    const ruleIdx = primaryRuleId !== undefined ? (ruleIndexMap.get(primaryRuleId) ?? 0) : 0;

    return {
      ruleId: primaryRuleId ?? 'unknown',
      ruleIndex: ruleIdx,
      level: severityToLevel(f.severity),
      message: { text: f.message },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: normalizeFileUri(f.file) },
            region: {
              startLine: f.startLine,
              endLine: f.endLine,
            },
          },
        },
      ],
      ...(f.evidence.length > 0
        ? {
            properties: {
              evidence: f.evidence,
              confidence: highestConfidence(f.evidence),
            },
          }
        : {}),
    };
  });

  const run: SarifRun = {
    tool: {
      driver: {
        name: 'NightHawk SecurityScan',
        version: toolVersion,
        informationUri: NIGHTHAWK_DEFAULT_SITE_BASE,
        rules,
      },
    },
    results,
    ...(metrics !== undefined
      ? {
          invocations: [
            {
              executionSuccessful: true,
              properties: { metrics },
            },
          ],
        }
      : {}),
  };

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [run],
  };
}
