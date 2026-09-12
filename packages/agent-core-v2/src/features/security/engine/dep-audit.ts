import { join } from 'pathe';

import type { IHostFileSystem } from '#/os/interface/hostFileSystem';

import type { FindingKind, NormalizedFinding } from './engine';

export interface KnownRisk {
  name: string;
  reason: string;
  cve?: string;
}

const KNOWN_RISKS: ReadonlyArray<KnownRisk> = [
  { name: 'lodash', reason: 'prototype pollution fixed only in >=4.17.21; older versions remain vulnerable', cve: 'CVE-2020-8203' },
  { name: 'axios', reason: 'SSRF/DoS issues fixed only in >=1.6.0 (CVE-2023-45857) and >=1.7.4 (CVE-2024-39338)' },
  { name: 'node-sass', reason: 'deprecated, native build issues, unmaintained; use sass' },
  { name: 'request', reason: 'deprecated since 2020, unpatched vulnerabilities' },
  { name: 'moment', reason: 'deprecated; legacy, in maintenance mode — consider dayjs/luxon/date-fns' },
  { name: 'left-pad', reason: 'famous npm incident; trivially replaceable' },
  { name: 'event-stream', reason: 'compromised package (2018 supply-chain attack)' },
  { name: 'colors', reason: 'v1.4.1 malicious infinite-loop release' },
  { name: 'faker', reason: 'v6.6.6 sabotage release; use @faker-js/faker' },
  { name: 'cross-env', reason: 'v7.0.3 supply-chain compromise (2025)' },
  { name: 'elliptic', reason: 'multiple signature-verification CVEs; keep >=6.5.7 or use @noble/curves' },
  { name: 'ws', reason: 'DoS CVEs fixed in >=7.5.10 / >=8.17.1' },
  { name: 'json5', reason: 'prototype pollution CVE-2022-46175; keep >=2.2.2' },
  { name: 'minimist', reason: 'prototype pollution CVE-2021-44906; keep >=1.2.6' },
  { name: 'handlebars', reason: 'RCE/prototype pollution in <4.7.7' },
  { name: 'pyyaml', reason: 'unsafe load by default in <5.1 (CVE-2017-18342)' },
  { name: 'requests', reason: 'CVE-2023-32681 (Proxy-Authorization leak) fixed in 2.31.0' },
  { name: 'pillow', reason: 'multiple image-parsing CVEs; keep >=10.3.0' },
  { name: 'jinja2', reason: 'XSS via xmlattr CVE-2024-34062; keep >=3.1.3' },
  { name: 'django', reason: 'check the Django security archive for your version' },
  { name: 'cryptography', reason: 'keep >=42.0.4 (CVE-2024-26130)' },
];

export interface DepAuditFinding {
  ecosystem: 'npm' | 'pip' | 'go';
  package: string;
  version: string;
  section?: string;
  kind: 'known-risk' | 'loose-range' | 'http-registry' | 'script-risk' | 'pseudo-version' | 'cve';
  message: string;
  cve?: string;
  cvss?: number;
  aliases?: string[];
  fixedVersion?: string;
  /** Origin: 'offline' for built-in checks, 'external' for host package-manager tools. */
  source?: 'offline' | 'external';
}

export interface DepAuditManifest {
  path: string;
  ecosystem: DepAuditFinding['ecosystem'];
}

export interface DepAuditResult {
  manifestsChecked: number;
  findings: DepAuditFinding[];
  externalFindings: DepAuditFinding[];
  externalSourced: boolean;
}

export interface ExternalAuditRunner {
  run(args: readonly string[]): Promise<string>;
}

export async function collectDependencyManifests(fs: IHostFileSystem, root: string): Promise<DepAuditManifest[]> {
  const manifests: DepAuditManifest[] = [];
  for (const candidate of [
    { path: join(root, 'package.json'), ecosystem: 'npm' as const },
    { path: join(root, 'requirements.txt'), ecosystem: 'pip' as const },
    { path: join(root, 'go.mod'), ecosystem: 'go' as const },
  ]) {
    try {
      const stat = await fs.stat(candidate.path);
      if (stat.isFile) {
        manifests.push(candidate);
      }
    } catch {}
  }
  return manifests;
}

export function parsePackageJson(manifestPath: string, content: string): DepAuditFinding[] {
  const findings: DepAuditFinding[] = [];
  const pkg = JSON.parse(content) as Record<string, any>;
  const sections: Array<[string, Record<string, string> | undefined]> = [
    ['dependencies', pkg['dependencies']],
    ['devDependencies', pkg['devDependencies']],
    ['optionalDependencies', pkg['optionalDependencies']],
  ];

  for (const [section, deps] of sections) {
    if (deps === null || deps === undefined) continue;
    for (const [name, range] of Object.entries(deps)) {
      const bare = name.startsWith('@') ? name.split('/')[1] ?? name : name;
      for (const risk of KNOWN_RISKS) {
        if (name === risk.name || (bare === risk.name && !name.startsWith('@'))) {
          findings.push({
            ecosystem: 'npm',
            package: name,
            version: String(range),
            section,
            kind: 'known-risk',
            message: `${risk.reason}${risk.cve ? ` (${risk.cve})` : ''}`,
            cve: risk.cve,
          });
        }
      }
      if (/^(\*|latest)$/.test(String(range))) {
        findings.push({
          ecosystem: 'npm',
          package: name,
          version: String(range),
          section,
          kind: 'loose-range',
          message: 'un-pinned version; resolve to a caret range and lockfile',
        });
      }
      if (String(range).startsWith('http://')) {
        findings.push({
          ecosystem: 'npm',
          package: name,
          version: String(range),
          section,
          kind: 'http-registry',
          message: 'fetched over plain http (registry hijack risk)',
        });
      }
    }
  }

  const scripts = pkg['scripts'] as Record<string, string> | undefined;
  const postinstall = scripts?.['postinstall'];
  if (postinstall !== undefined && /curl|wget|eval|http:\/\//i.test(String(postinstall))) {
    findings.push({
      ecosystem: 'npm',
      package: manifestPath,
      version: 'scripts.postinstall',
      section: 'scripts',
      kind: 'script-risk',
      message: 'postinstall fetches remote content — supply-chain risk',
    });
  }

  return findings;
}

export function parseRequirementsTxt(content: string): DepAuditFinding[] {
  const findings: DepAuditFinding[] = [];
  for (const line of content.split('\n')) {
    const m = line.trim().match(/^([A-Za-z0-9_.-]+)(?:[=<>~!]=?\s*([^\s;#]+))?/);
    if (!m) continue;
    const name = (m[1] ?? '').toLowerCase();
    const version = m[2] ?? '';
    for (const risk of KNOWN_RISKS) {
      if (name === risk.name) {
        findings.push({
          ecosystem: 'pip',
          package: name,
          version,
          kind: 'known-risk',
          message: `${risk.reason}${risk.cve ? ` (${risk.cve})` : ''}`,
          cve: risk.cve,
        });
      }
    }
  }
  return findings;
}

export function parseGoMod(content: string): DepAuditFinding[] {
  const findings: DepAuditFinding[] = [];
  for (const line of content.split('\n')) {
    const m = line.trim().match(/^(?:require\s+)?([\w./-]+)\s+v(\S+)/);
    if (!m) continue;
    const name = m[1] ?? '';
    const version = m[2] ?? '';
    if (/^v?0\.0\.0-\d{14}-/.test(version)) {
      findings.push({
        ecosystem: 'go',
        package: name,
        version,
        kind: 'pseudo-version',
        message: 'pseudo-version pin; prefer a tagged release',
      });
    }
  }
  return findings;
}

export interface LockFileInfo {
  ecosystem: 'npm' | 'pip';
  packageManager: string;
}

const LOCKFILE_MAP: Array<{ filename: string; info: LockFileInfo }> = [
  { filename: 'pnpm-lock.yaml', info: { ecosystem: 'npm', packageManager: 'pnpm' } },
  { filename: 'package-lock.json', info: { ecosystem: 'npm', packageManager: 'npm' } },
  { filename: 'yarn.lock', info: { ecosystem: 'npm', packageManager: 'npm' } },
  { filename: 'Pipfile.lock', info: { ecosystem: 'pip', packageManager: 'pip-audit' } },
  { filename: 'poetry.lock', info: { ecosystem: 'pip', packageManager: 'pip-audit' } },
];

export async function detectPackageManager(fs: IHostFileSystem, root: string): Promise<LockFileInfo | undefined> {
  for (const { filename, info } of LOCKFILE_MAP) {
    try {
      const stat = await fs.stat(join(root, filename));
      if (stat.isFile) return info;
    } catch {}
  }
  return undefined;
}

export function parseNpmAuditJson(
  raw: string,
  pm: string,
): DepAuditFinding[] {
  const findings: DepAuditFinding[] = [];
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return findings;
  }

  const vulnerabilities = data.vulnerabilities as Record<string, any> | undefined;
  if (!vulnerabilities) return findings;

  for (const [pkgName, vuln] of Object.entries(vulnerabilities)) {
    if (!vuln || typeof vuln !== 'object') continue;
    const severity: string = vuln.severity ?? 'unknown';
    const via: any[] = Array.isArray(vuln.via) ? vuln.via : [];
    for (const entry of via) {
      if (!entry || typeof entry === 'string') continue;
      const title: string = entry.title ?? 'unknown vulnerability';
      const url: string = entry.url ?? '';
      const cve = (url.match(/(CVE-\d{4}-\d+)/) ?? entry.cve ?? [])[1];
      const range: string = entry.range ?? '';
      findings.push({
        ecosystem: 'npm',
        package: pkgName,
        version: range || (vuln.range ?? ''),
        kind: 'cve',
        message: `[${pm} audit] ${title} (severity: ${severity})`,
        cve,
        cvss: severity === 'critical' ? 9.5 : severity === 'high' ? 7.5 : severity === 'moderate' ? 5 : severity === 'low' ? 2.5 : undefined,
        fixedVersion: entry.fixAvailable ? (typeof entry.fixAvailable === 'object' ? entry.fixAvailable.version : 'see advisory') : undefined,
        source: 'external',
      });
    }
  }
  return findings;
}

export function parsePipAuditJson(raw: string): DepAuditFinding[] {
  const findings: DepAuditFinding[] = [];
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return findings;
  }

  const deps: any[] = Array.isArray(data) ? data : (data.dependencies ?? []);
  for (const dep of deps) {
    if (!dep || typeof dep !== 'object') continue;
    const vulns: any[] = dep.vulns ?? dep.vulnerabilities ?? [];
    for (const v of vulns) {
      if (!v || typeof v !== 'object') continue;
      const aliases: string[] = v.aliases ?? [];
      const cve = aliases.find((a: string) => a.startsWith('CVE-'));
      const fixedVersions: string[] = v.fixed_versions ?? [];
      findings.push({
        ecosystem: 'pip',
        package: dep.name ?? '',
        version: dep.version ?? '',
        kind: 'cve',
        message: `[pip-audit] ${v.id ?? v.description ?? 'unknown vulnerability'}`,
        cve,
        fixedVersion: fixedVersions.length > 0 ? fixedVersions[fixedVersions.length - 1] : undefined,
        aliases,
        source: 'external',
      });
    }
  }
  return findings;
}

export function depFindingToNormalized(f: DepAuditFinding): NormalizedFinding {
  const sev = f.kind === 'cve'
    ? (f.cvss !== undefined && f.cvss >= 7 ? 'critical' as const : 'high' as const)
    : f.kind === 'known-risk' || f.kind === 'script-risk'
    ? 'high' as const
    : f.kind === 'http-registry' || f.kind === 'pseudo-version'
    ? 'medium' as const
    : 'low' as const;

  return {
    file: f.package,
    startLine: 1,
    message: `[dep:${f.kind}] ${f.package}@${f.version}: ${f.message}`,
    severity: sev,
    evidence: [
      {
        kind: 'dep' as FindingKind,
        ruleId: f.cve,
        source: f.source ?? (f.kind === 'cve' ? 'external' : 'offline'),
        confidence: f.kind === 'cve' ? 'high' : 'medium',
        analyzerVersion: '1.0.0',
      },
    ],
  };
}
