import type { Kaos } from '@nighthawk/kaos';
import { basename, dirname, join } from 'pathe';

import type { SecurityRule, Severity } from './rules';
import { detectLanguage, SECURITY_RULES } from './rules';

import type { SarifLog } from './sarif-formatter';
import { formatToSarif } from './sarif-formatter';

export type { Severity } from './rules';

export interface ScanResult {
  rule: SecurityRule;
  file: string;
  line: number;
  match: string;
  context: string;
}

export type FindingKind = 'rule' | 'ast' | 'secret' | 'taint' | 'dep';

export interface FindingEvidence {
  kind: FindingKind;
  ruleId?: string;
  source?: string;
  confidence?: 'high' | 'medium' | 'low';
  analyzerVersion?: string;
}

export interface NormalizedFinding {
  file: string;
  startLine: number;
  endLine?: number;
  message: string;
  severity: Severity;
  evidence: FindingEvidence[];
}

export interface ScanMetrics {
  filesScanned: number;
  filesSkipped: number;
  filesParseFailed: number;
  cacheHits: number;
  durationMs: number;
}

export interface ScanReport {
  results: ScanResult[];
  filesScanned: number;
  durationMs: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  findings?: NormalizedFinding[];
  metrics?: ScanMetrics;
  sarif?: SarifLog;
}

export interface SecretFinding {
  file: string;
  line: number;
  type: string;
  preview: string;
  entropy: number;
  confidence: 'high' | 'medium';
}

export interface TaintFinding {
  file: string;
  source: { line: number; desc: string };
  sink: { line: number; desc: string; risk: string };
  varName: string;
  flow: string;
}

export const SKIP_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'out', 'target',
  'vendor', '.venv', 'venv', '__pycache__', '.tox', '.mypy_cache', '.idea',
  '.next', '.nuxt', 'coverage', '.turbo', '.cache',
]);

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

const MAX_SCAN_FILES = 5000;
const MAX_RESULTS_PER_FILE = 200;
const MAX_FILE_BYTES = 2_000_000;

export interface ScanOptions {
  root: string;
  include?: string;
  minSeverity?: Severity;
  categories?: readonly string[];
  maxFiles?: number;
  /** Callback invoked with scan progress. */
  onProgress?: ScanProgressCallback;
  /** Persist cache to disk after every N files (0 = only at end). Default 100. */
  persistBatchSize?: number;
}

export interface ScanProgress {
  processed: number;
  total: number;
  currentFile: string;
}

export type ScanProgressCallback = (progress: ScanProgress) => void;

const CONCURRENCY = 16;
const DEFAULT_PERSIST_BATCH_SIZE = 100;

function globMatch(name: string, pattern: string): boolean {
  const re = new RegExp(
    `^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`,
  );
  return re.test(name);
}

export async function collectFiles(
  kaos: Kaos,
  root: string,
  include?: string,
  maxFiles = MAX_SCAN_FILES,
): Promise<string[]> {
  const files: string[] = [];
  let rootIsFile = false;
  try {
    const stat = await kaos.stat(root);
    rootIsFile = (stat.stMode & 0o170000) === 0o100000;
  } catch {
    return [];
  }
  if (rootIsFile) return [root];

  async function walk(dir: string): Promise<void> {
    if (files.length >= maxFiles) return;
    try {
      for await (const entry of kaos.iterdir(dir)) {
        if (files.length >= maxFiles) return;
        // iterdir yields full paths; derive the basename for filters.
        const name = basename(entry);
        if (SKIP_DIRS.has(name) || (name.startsWith('.') && name !== '.github')) continue;
        const full = entry;
        let isDir = false;
        try {
          const st = await kaos.stat(full, { followSymlinks: false });
          isDir = (st.stMode & 0o170000) === 0o040000;
        } catch {
          continue;
        }
        if (isDir) await walk(full);
        else if (include === undefined || globMatch(name, include)) files.push(full);
      }
    } catch {
      // unreadable directory — skip
    }
  }
  await walk(root);
  return files;
}

export function scanContent(content: string, file: string, rules: readonly SecurityRule[]): ScanResult[] {
  const lang = detectLanguage(file);
  const lines = content.split('\n');
  const out: ScanResult[] = [];
  for (const rule of rules) {
    if (!(rule.languages.includes('*') || rule.languages.includes(lang))) continue;
    for (const re of rule.patterns) {
      re.lastIndex = 0;
      for (const m of content.matchAll(re)) {
        const upto = m.index ?? 0;
        const line = content.slice(0, upto).split('\n').length;
        out.push({
          rule,
          file,
          line,
          match: m[0].slice(0, 200),
          context: lines
            .slice(Math.max(0, line - 2), line + 1)
            .map((l, i) => `  ${String(Math.max(1, line - 1) + i)} | ${l}`)
            .join('\n'),
        });
        if (out.length > MAX_RESULTS_PER_FILE) return out;
      }
    }
  }
  return out;
}

function toNormalizedFindings(scanResults: ScanResult[]): NormalizedFinding[] {
  return scanResults.map(r => ({
    file: r.file,
    startLine: r.line,
    message: `[${r.rule.id}] ${r.rule.name}`,
    severity: r.rule.severity,
    evidence: [
      {
        kind: 'rule' as const,
        ruleId: r.rule.id,
        source: 'regex',
        confidence: 'medium',
      },
    ],
  }));
}

export async function runScan(
  kaos: Kaos,
  opts: ScanOptions,
  cache?: ScanCache,
  createCache?: () => Promise<ScanCache>,
): Promise<ScanReport> {
  let activeCache = cache;
  if (!activeCache && createCache) {
    try {
      activeCache = await createCache();
    } catch {
      // 降级为无缓存
    }
  }
  const start = Date.now();
  const minSev = opts.minSeverity !== undefined ? (SEVERITY_ORDER[opts.minSeverity] ?? 99) : 99;
  let rules = SECURITY_RULES_FILTERED(minSev);
  if (opts.categories?.length) {
    const cats = new Set(opts.categories);
    rules = rules.filter(r => cats.has(r.category));
  }
  const files = await collectFiles(kaos, opts.root, opts.include, opts.maxFiles);
  const results: ScanResult[] = [];
  const allFindings: NormalizedFinding[] = [];
  const persistBatchSize = opts.persistBatchSize ?? DEFAULT_PERSIST_BATCH_SIZE;
  let filesSkipped = 0;
  let filesParseFailed = 0;
  let cacheHits = 0;

  // A persistent cache is persisted to disk at intervals. Streaming persistence
  // must be serialized with concurrent workers, so writes funnel through a single
  // promise chain rather than racing each other.
  let persistChain: Promise<void> = Promise.resolve();
  const streamPersist = (): void => {
    if (activeCache === undefined) return;
    persistChain = persistChain.then(async () => {
      if (typeof (activeCache as any).persist === 'function') {
        await (activeCache as any).persist();
      }
    });
  };

  const scanFile = async (f: string): Promise<{ scanResults: ScanResult[]; normalizedFindings: NormalizedFinding[] }> => {
    try {
      const stat = await kaos.stat(f);
      if (stat.stSize > MAX_FILE_BYTES) {
        filesSkipped++;
        return { scanResults: [], normalizedFindings: [] };
      }
      const content = await kaos.readText(f, { errors: 'replace' });
      if (activeCache !== undefined) {
        const key = createScanCacheKey('1', f, content);
        const hit = activeCache.get(key);
        if (hit !== undefined) {
          cacheHits++;
          return { scanResults: hit.scanResults, normalizedFindings: hit.normalizedFindings };
        }
        const scanResults = scanContent(content, f, rules);
        const normalizedFindings = toNormalizedFindings(scanResults);
        activeCache.set(key, {
          key,
          generatedAt: Date.now(),
          scanResults,
          normalizedFindings,
        });
        return { scanResults, normalizedFindings };
      }
      const scanResults = scanContent(content, f, rules);
      return { scanResults, normalizedFindings: toNormalizedFindings(scanResults) };
    } catch {
      filesParseFailed++;
      return { scanResults: [], normalizedFindings: [] };
    }
  };

  // Worker pool: workers pull the next file as soon as one finishes instead of
  // waiting for an entire batch to settle, keeping all workers busy.
  let nextIndex = 0;
  const total = files.length;
  let processed = 0;
  const emitProgress = (file: string): void => {
    opts.onProgress?.({ processed, total, currentFile: file });
  };
  const worker = async (): Promise<void> => {
    for (;;) {
      const i = nextIndex++;
      if (i >= total) return;
      const f = files[i] ?? '';
      const { scanResults, normalizedFindings } = await scanFile(f);
      results.push(...scanResults);
      allFindings.push(...normalizedFindings);
      processed++;
      if (persistBatchSize > 0 && processed % persistBatchSize === 0) {
        streamPersist();
      }
      emitProgress(f);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker()));
  await persistChain;
  results.sort((a, b) => (SEVERITY_ORDER[a.rule.severity] ?? 99) - (SEVERITY_ORDER[b.rule.severity] ?? 99));
  const bySeverity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  for (const r of results) {
    bySeverity[r.rule.severity] = (bySeverity[r.rule.severity] ?? 0) + 1;
    byCategory[r.rule.category] = (byCategory[r.rule.category] ?? 0) + 1;
  }
  const findings: NormalizedFinding[] = activeCache !== undefined
    ? allFindings
    : results.map(r => ({
        file: r.file,
        startLine: r.line,
        message: `[${r.rule.id}] ${r.rule.name}`,
        severity: r.rule.severity,
        evidence: [
          {
            kind: 'rule',
            ruleId: r.rule.id,
            source: 'regex',
            confidence: 'medium',
          },
        ],
      }));

  if (activeCache && typeof (activeCache as any).persist === 'function') {
    await (activeCache as any).persist();
  }

  return {
    results,
    filesScanned: files.length,
    durationMs: Date.now() - start,
    bySeverity,
    byCategory,
    findings,
    metrics: {
      filesScanned: files.length,
      filesSkipped,
      filesParseFailed,
      cacheHits,
      durationMs: Date.now() - start,
    },
    sarif: formatToSarif(findings, {
      filesScanned: files.length,
      filesSkipped,
      filesParseFailed,
      cacheHits,
      durationMs: Date.now() - start,
    }),
  };
}

export interface ScanCacheKey {
  version: string;
  file: string;
  contentHash: string;
}

export interface ScanCacheEntry {
  key: ScanCacheKey;
  generatedAt: number;
  scanResults: ScanResult[];
  normalizedFindings: NormalizedFinding[];
}

const MEMORY_SCAN_CACHE_MAX_ENTRIES = 2048;

export class ScanCache {
  private readonly entries = new Map<string, ScanCacheEntry>();

  constructor(private readonly maxSize = MEMORY_SCAN_CACHE_MAX_ENTRIES) {}

  get(key: ScanCacheKey): ScanCacheEntry | undefined {
    return this.entries.get(this.toIndex(key));
  }

  set(key: ScanCacheKey, value: ScanCacheEntry): void {
    const index = this.toIndex(key);
    if (this.entries.has(index)) {
      this.entries.set(index, value);
      return;
    }
    if (this.entries.size >= this.maxSize) {
      const first = this.entries.keys().next().value;
      if (first !== undefined) {
        this.entries.delete(first);
      }
    }
    this.entries.set(index, value);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }

  private toIndex(key: ScanCacheKey): string {
    return `${key.version}::${key.file}::${key.contentHash}`;
  }
}

export function createScanCacheKey(version: string, file: string, content: string): ScanCacheKey {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash * 31 + content.charCodeAt(i)) | 0;
  }
  return {
    version,
    file,
    contentHash: `h32:${String(hash >>> 0)}`,
  };
}

function SECURITY_RULES_FILTERED(minSev: number): readonly SecurityRule[] {
  return SECURITY_RULES.filter(r => (SEVERITY_ORDER[r.severity] ?? 99) <= minSev);
}

export function formatScanReport(report: ScanReport, outputFormat?: 'text' | 'sarif'): string {
  if (outputFormat === 'sarif' && report.sarif !== undefined) {
    return JSON.stringify(report.sarif, null, 2);
  }

  const sevIcon: Record<string, string> = {
    critical: '[CRITICAL]',
    high: '[HIGH]',
    medium: '[MEDIUM]',
    low: '[LOW]',
    info: '[INFO]',
  };
  const head = `Security scan complete: ${String(report.filesScanned)} files scanned, ${String(report.results.length)} findings (${String(report.durationMs)}ms)`;
  const sevLine =
    Object.entries(report.bySeverity)
      .map(([s, n]) => `${sevIcon[s] ?? s} ${s}: ${String(n)}`)
      .join('  ') || 'No findings';
  const shown = report.results.slice(0, 50);
  const body = shown
    .map(
      r =>
        `${sevIcon[r.rule.severity] ?? r.rule.severity} [${r.rule.id}] ${r.rule.name}\n` +
        `   ${r.file}:${String(r.line)}  (${r.rule.cwe ?? 'N/A'}${r.rule.owasp ? `, ${r.rule.owasp}` : ''})\n` +
        `   Fix: ${r.rule.fix}`,
    )
    .join('\n\n');
  const more =
    report.results.length > shown.length ? `\n\n... ${String(report.results.length - shown.length)} more findings` : '';
  return `${head}\n${sevLine}\n\n${body}${more}`;
}

// ── Secret scanning ───────────────────────────────────────────────

interface SecretPattern {
  type: string;
  re: RegExp;
  confidence: 'high' | 'medium';
  minEntropy?: number;
}

const PATTERNS: SecretPattern[] = [
  { type: 'AWS Access Key', re: /AKIA[0-9A-Z]{16}/g, confidence: 'high' },
  { type: 'AWS Secret Key', re: /(?<=["'`\s])[A-Za-z0-9/+=]{40}(?=["'`\s])/g, confidence: 'medium', minEntropy: 3.5 },
  { type: 'GitHub Token', re: /gh[pousr]_[A-Za-z0-9]{36,}/g, confidence: 'high' },
  { type: 'GitLab Token', re: /glpat-[A-Za-z0-9\-_]{20,}/g, confidence: 'high' },
  { type: 'Slack Token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g, confidence: 'high' },
  { type: 'Google API Key', re: /AIza[0-9A-Za-z\-_]{35}/g, confidence: 'high' },
  { type: 'Private Key Block', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g, confidence: 'high' },
  { type: 'JWT', re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, confidence: 'medium' },
  { type: 'OpenAI Key', re: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g, confidence: 'high' },
  { type: 'Anthropic Key', re: /sk-ant-[A-Za-z0-9_-]{20,}/g, confidence: 'high' },
  { type: 'MongoDB URI', re: /mongodb(?:\+srv)?:\/\/[^:\s"']+:[^@\s"']+@/g, confidence: 'high' },
  { type: 'PostgreSQL URI', re: /postgres(?:ql)?:\/\/[^:\s"']+:[^@\s"']+@/g, confidence: 'high' },
  { type: 'MySQL URI', re: /mysql:\/\/[^:\s"']+:[^@\s"']+@/g, confidence: 'high' },
  { type: 'Redis URI', re: /rediss?:\/\/[^:\s"']*:[^@\s"']+@/g, confidence: 'high' },
  { type: 'Stripe Key', re: /sk_live_[A-Za-z0-9]{24,}|pk_live_[A-Za-z0-9]{24,}/g, confidence: 'high' },
  { type: 'Telegram Bot Token', re: /\d{8,10}:AA[A-Za-z0-9_-]{33}/g, confidence: 'high' },
  { type: 'Tencent Cloud Secret', re: /(?<=["'`\s])[A-Za-z0-9]{36}(?=["'`\s])/g, confidence: 'medium', minEntropy: 3.8 },
];

const KEY_ASSIGN =
  /(?:secret|token|key|password|passwd|credential|api_key|apikey|access_key)\s*[=:]\s*["'`]([A-Za-z0-9+/_=-]{16,})["'`]/gi;

function shannonEntropy(s: string): number {
  const freq: Record<string, number> = {};
  for (const c of s) freq[c] = (freq[c] ?? 0) + 1;
  return Object.values(freq).reduce((e, n) => {
    const p = n / s.length;
    return e - p * Math.log2(p);
  }, 0);
}

function mask(s: string): string {
  if (s.length <= 12) return `${s.slice(0, 4)}****`;
  return `${s.slice(0, 8)}...${s.slice(-4)}`;
}

export function scanSecretsInContent(content: string, file: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    for (const m of content.matchAll(p.re)) {
      const line = content.slice(0, m.index ?? 0).split('\n').length;
      const ent = shannonEntropy(m[0]);
      if (p.minEntropy !== undefined && ent < p.minEntropy) continue;
      findings.push({
        file,
        line,
        type: p.type,
        preview: mask(m[0]),
        entropy: Number(ent.toFixed(2)),
        confidence: p.confidence,
      });
    }
  }
  KEY_ASSIGN.lastIndex = 0;
  for (const m of content.matchAll(KEY_ASSIGN)) {
    const line = content.slice(0, m.index ?? 0).split('\n').length;
    const val = m[1] ?? '';
    const ent = shannonEntropy(val);
    if (ent > 3.2 && !/^(?:true|false|null|undefined|none|0+|x+|test|example|placeholder|your[_-]?)\w*$/i.test(val)) {
      findings.push({
        file,
        line,
        type: 'Hardcoded Credential',
        preview: mask(val),
        entropy: Number(ent.toFixed(2)),
        confidence: ent > 4 ? 'high' : 'medium',
      });
    }
  }
  return findings;
}

export async function scanSecrets(kaos: Kaos, root: string, include?: string): Promise<SecretFinding[]> {
  const findings: SecretFinding[] = [];
  const files = await collectFiles(kaos, root, include);
  const CONCURRENCY = 16;
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async f => {
        try {
          const stat = await kaos.stat(f);
          if (stat.stSize > MAX_FILE_BYTES) return [];
          const content = await kaos.readText(f, { errors: 'replace' });
          return scanSecretsInContent(content, f);
        } catch {
          return [];
        }
      }),
    );
    findings.push(...settled.flat());
  }
  return findings;
}

export function formatSecrets(findings: readonly SecretFinding[]): string {
  if (findings.length === 0) return 'No secrets or credentials detected.';
  const header = `Secret scan: ${String(findings.length)} potential secret(s) found:\n`;
  return (
    header +
    findings
      .slice(0, 50)
      .map(
        f =>
          `CONFIDENT ${f.confidence.toUpperCase()} [${f.type}]\n` +
          `   ${f.file}:${String(f.line)}  entropy=${String(f.entropy)}\n` +
          `   preview: ${f.preview}`,
      )
      .join('\n\n')
  );
}

// ── Taint analysis ────────────────────────────────────────────────

const SOURCES: ReadonlyArray<{ re: RegExp; desc: string }> = [
  { re: /request\.(?:GET|POST|args|form|values|data|json|files)(?:\.get\()?\[?\s*['"`]?(\w+)/gi, desc: 'Flask/Django request' },
  { re: /req\.(?:query|params|body|cookies|headers)\.(\w+)/gi, desc: 'Express req' },
  { re: /(?:params|query|args|input|request|event)\[?\s*['"`]?(\w+)/gi, desc: 'user input' },
  { re: /(?:input|gets|readline|Scanner|stdin)\s*\(\s*\)/gi, desc: 'stdin read' },
  { re: /\$_(?:GET|POST|REQUEST|COOKIE|SERVER)\[.?.?(\w+)/gi, desc: 'PHP superglobal' },
  { re: /os\.environ(?:\.get)?\[(?:'|"|`)(\w+)/gi, desc: 'env var' },
  { re: /event\.target\.value/gi, desc: 'DOM event value' },
  { re: /process\.argv/gi, desc: 'process.argv' },
  { re: /crypto\.randomBytes/gi, desc: 'crypto random bytes' },
  { re: /window\.location\.(?:hash|search)/gi, desc: 'URL location param' },
];

const SINKS: ReadonlyArray<{ re: RegExp; desc: string; risk: string }> = [
  { re: /(?:execute|executemany|query|raw)\s*\(/gi, desc: 'SQL execute', risk: 'SQL Injection' },
  { re: /os\.(?:system|popen)\s*\(|subprocess\.(?:run|call|Popen|check_output)\s*\(/gi, desc: 'shell exec', risk: 'Command Injection' },
  { re: /child_process\.(?:exec|execSync|spawn|fork)\s*\(|Runtime\./gi, desc: 'process exec', risk: 'Command Injection' },
  { re: /(?:eval|new\s+Function|exec)\s*\(/gi, desc: 'eval', risk: 'Code Injection' },
  { re: /\.innerHTML\s*=|document\.write\s*\(/gi, desc: 'DOM write', risk: 'XSS' },
  { re: /(?:open|readFile|writeFile|sendFile|File)\s*\(/gi, desc: 'file op', risk: 'Path Traversal' },
  { re: /(?:requests\.|fetch|axios|urlopen|http\.Get)/gi, desc: 'HTTP request', risk: 'SSRF' },
  { re: /(?:pickle\.|unserialize|Marshal\.|yaml\.load)\s*\(/gi, desc: 'deserialize', risk: 'Deserialization' },
  { re: /res\.(?:send|json|end)\s*\(/gi, desc: 'HTTP response', risk: 'Information Disclosure' },
  { re: /console\.(?:log|error|warn|info)\s*\(/gi, desc: 'console output', risk: 'Info Leak' },
  { re: /fs\.promises\.\w+\s*\(/gi, desc: 'fs.promises op', risk: 'Path Traversal' },
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectSourceTaint(lines: readonly string[]): Map<string, { line: number; desc: string }> {
  const tainted = new Map<string, { line: number; desc: string }>();
  lines.forEach((line, i) => {
    for (const src of SOURCES) {
      src.re.lastIndex = 0;
      const m = src.re.exec(line);
      if (m) {
        const assign = line.match(/(?:const|let|var|\b)\s*(\w+)\s*=\s*[^=]/);
        const varName = assign?.[1] ?? m[1];
        if (
          varName !== undefined &&
          varName.length > 1 &&
          !['if', 'for', 'while', 'return', 'const', 'let', 'var'].includes(varName)
        ) {
          tainted.set(varName, { line: i + 1, desc: src.desc });
        }
      }
    }
  });
  return tainted;
}

function propagateTaint(
  lines: readonly string[],
  tainted: Map<string, { line: number; desc: string }>,
): void {
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (const line of lines) {
      const assign = line.match(/(\w+)\s*=\s*(.*)/);
      if (!assign) continue;
      const target = assign[1] ?? '';
      const rhs = assign[2] ?? '';
      for (const [srcVar, meta] of tainted) {
        if (rhs.includes(srcVar) && !tainted.has(target)) {
          tainted.set(target, meta);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
}

function collectSinkFindings(
  lines: readonly string[],
  file: string,
  tainted: Map<string, { line: number; desc: string }>,
): TaintFinding[] {
  const findings: TaintFinding[] = [];
  lines.forEach((line, i) => {
    for (const sink of SINKS) {
      sink.re.lastIndex = 0;
      if (!sink.re.test(line)) continue;
      for (const [varName, meta] of tainted) {
        const useRe = new RegExp(`\\b${escapeRe(varName)}\\b`);
        if (useRe.test(line)) {
          findings.push({
            file,
            source: meta,
            sink: { line: i + 1, desc: line.trim().slice(0, 100), risk: sink.risk },
            varName,
            flow: `L${String(meta.line)} [${meta.desc}] -> ${varName} -> L${String(i + 1)} [${sink.desc}]`,
          });
        }
      }
    }
  });
  return findings;
}

export function taintAnalyzeContent(content: string, file: string): TaintFinding[] {
  const lines = content.split('\n');
  const tainted = collectSourceTaint(lines);
  if (tainted.size === 0) return [];
  propagateTaint(lines, tainted);
  return collectSinkFindings(lines, file, tainted);
}

export async function taintAnalyze(kaos: Kaos, file: string): Promise<TaintFinding[]> {
  try {
    const content = await kaos.readText(file, { errors: 'replace' });
    return taintAnalyzeContent(content, file);
  } catch {
    return [];
  }
}

/** Name given to an exported symbol in the importing module. */
interface ModuleBinding {
  /** Specifier of the imported module (verbatim from the import statement). */
  spec: string;
  /** Local name bound in the importer, or null for side-effect imports. */
  local?: string;
  /** The exporter-side symbol this binding is resolved to (defaults to local). */
  remote?: string;
}

/**
 * Parse the import statements of a module into a list of bindings. Covers
 * the common ESM named/default/side-effect forms and CJS `require` forms.
 * Unparseable or bare (npm) imports yield bindings with no local name so the
 * graph walk simply skips them.
 */
function extractModuleBindings(content: string): ModuleBinding[] {
  const bindings: ModuleBinding[] = [];
  for (const line of content.split('\n')) {
    if (/require\s*\(/.test(line)) {
      const local = line.match(/(?:const|let|var)\s+\{?\s*([A-Za-z_$][\w$]*)\s*\}?\s*=\s*require\s*\(/);
      const spec = line.match(/require\s*\(\s*(['"])([^'"]+)\1\s*\)/);
      if (spec && spec[2]) bindings.push({ spec: spec[2], local: local?.[1] });
      continue;
    }
    if (/import\s+.*\bfrom\s+/.test(line) || /^import\s+['"]/.test(line.trimStart())) {
      const spec = line.match(/from\s+(['"])([^'"]+)\1/);
      if (!spec || !spec[2]) continue;
      const s = spec[2];
      const named = line.match(/import\s*\{([^}]+)\}\s*from/);
      if (named) {
        for (const part of named[1]!.split(',')) {
          const [remotePart, asLocal] = part.trim().split(/\s+as\s+/);
          if (!remotePart) continue;
          bindings.push({
            spec: s,
            local: (asLocal ?? remotePart)?.trim(),
            remote: remotePart.trim(),
          });
        }
        continue;
      }
      const ns = line.match(/import\s*\*\s+as\s+([\w$]+)\s+from/);
      if (ns) {
        bindings.push({ spec: s, local: ns[1] });
        continue;
      }
      const def = line.match(/import\s+([A-Za-z_$][\w$]*)\s+from\s+/);
      if (def) {
        bindings.push({ spec: s, local: def[1] });
        continue;
      }
      // Side-effect import — no bindings.
      bindings.push({ spec: s });
    }
  }
  return bindings;
}

/** Names exported by a module (ESM `export const/function/class/default` and `export { a }`, CJS `module.exports = x`). */
function extractExportedNames(content: string): Set<string> {
  const names = new Set<string>();
  for (const m of content.matchAll(/\bexport\s+(?:(?:const|let|var|function|class|namespace)\s+|default\s+)?(\w+)/g)) {
    if (m[1]) names.add(m[1]);
  }
  for (const m of content.matchAll(/\bexport\s*\{\s*([^}]+)\}\s*[;]?$/gm)) {
    for (const part of m[1]!.split(',')) {
      const name = part.split(/\s+as\s+/)[0]?.trim();
      if (name) names.add(name);
    }
  }
  for (const m of content.matchAll(/\bmodule\.exports\s*=\s*(\w+)/g)) {
    if (m[1]) names.add(m[1]);
  }
  return names;
}

/**
 * Resolve a relative module specifier against the importing file's directory,
 * probing for an existing file (explicit extension, common TS/JS extensions,
 * and directory `index`). Returns null for bare/npm specifiers or when no
 * candidate exists on disk.
 */
async function resolveModuleFile(kaos: Kaos, spec: string, fromDir: string): Promise<string | null> {
  if ((!spec.startsWith('.') && !spec.startsWith('/')) || spec.startsWith('node:')) return null;
  if (spec.startsWith('/')) return null; // absolute paths are outside the module graph walk
  const base = join(fromDir, spec);
  const candidates = [
    base,
    `${base}.js`,
    `${base}.ts`,
    `${base}.jsx`,
    `${base}.tsx`,
    `${base}.mjs`,
    `${base}.cjs`,
    join(base, 'index.js'),
    join(base, 'index.ts'),
    join(base, 'index.mjs'),
  ];
  for (const c of candidates) {
    try {
      const stat = await kaos.stat(c);
      if ((stat.stMode & 0o170000) === 0o100000) return c;
    } catch {}
  }
  return null;
}

/**
 * Cross-file taint analysis. Traces source taint across a module graph:
 * loads the entry file and every relative module it imports (recursively),
 * propagates taint through exported symbols into importers, and reports
 * sink flows on the file where the tainted value reaches a sink.
 *
 * Limitation: bare/npm imports (`import x from 'pkg'`) are not followed, and
 * dynamic imports / re-exports are resolved on a best-effort line basis.
 */
export async function taintAnalyzeModule(kaos: Kaos, file: string): Promise<TaintFinding[]> {
  interface ModuleState {
    content: string;
    bindings: ModuleBinding[];
    exports: Set<string>;
    lines: string[];
  }

  const modules = new Map<string, ModuleState>();
  const queue: string[] = [file];

  while (queue.length > 0) {
    const f = queue.shift()!;
    if (modules.has(f)) continue;
    let content: string;
    try {
      content = await kaos.readText(f, { errors: 'replace' });
    } catch {
      continue;
    }
    const state: ModuleState = {
      content,
      bindings: extractModuleBindings(content),
      exports: extractExportedNames(content),
      lines: content.split('\n'),
    };
    modules.set(f, state);
    const fromDir = dirname(f);
    for (const b of state.bindings) {
      const resolved = await resolveModuleFile(kaos, b.spec, fromDir);
      if (resolved) queue.push(resolved);
    }
  }

  const findings: TaintFinding[] = [];

  // Persistent set of exported symbol -> source meta, fed forward between
  // fixpoint rounds so taint that arrives via imports can cascade onward.
  const exportTaint = new Map<string, Map<string, { line: number; desc: string }>>();

  for (let round = 0; round < 8; round++) {
    let changed = false;

    for (const [f, state] of modules) {
      const tainted = collectSourceTaint(state.lines);

      // Imports whose source module exports tainted symbols bind taint locally.
      for (const b of state.bindings) {
        if (!b.local) continue;
        const fromDir = dirname(f);
        const dep = await resolveModuleFile(kaos, b.spec, fromDir);
        if (!dep) continue;
        const depExport = exportTaint.get(dep);
        if (depExport) {
          const remoteName = b.remote ?? b.local;
          const meta = depExport.get(remoteName);
          if (meta && !tainted.has(b.local)) {
            tainted.set(b.local, {
              line: meta.line,
              desc: `${meta.desc} (via ${basename(dep)})`,
            });
            changed = true;
          }
        }
      }

      propagateTaint(state.lines, tainted);

      // Record which of this module's exports are now tainted for importers.
      let prev = exportTaint.get(f);
      if (!prev) {
        prev = new Map();
        exportTaint.set(f, prev);
      }
      for (const name of state.exports) {
        const meta = tainted.get(name);
        if (meta && !prev.has(name)) {
          prev.set(name, meta);
          changed = true;
        }
      }

      const fileFindings = collectSinkFindings(state.lines, f, tainted);
      if (fileFindings.length > 0) {
        findings.push(...fileFindings);
      }
    }

    if (!changed) break;
  }

  // The fixpoint loop may re-emit identical flows across rounds; dedupe by
  // (file, variable, sink line) to keep the result stable.
  const seen = new Set<string>();
  const unique: TaintFinding[] = [];
  for (const f of findings) {
    const key = `${f.file}:${f.varName}:${String(f.source.line)}:${String(f.sink.line)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(f);
    }
  }
  return unique;
}

export function formatTaint(findings: readonly TaintFinding[]): string {
  if (findings.length === 0) return 'No taint flows found.';
  const header = `Taint analysis: ${String(findings.length)} flow(s) found:\n`;
  return (
    header +
    findings
      .slice(0, 30)
      .map(
        f =>
          `RISK [${f.sink.risk}]\n` +
          `   Flow: ${f.flow}\n` +
          `   Source: L${String(f.source.line)} (${f.source.desc})\n` +
          `   Sink:   L${String(f.sink.line)}: ${f.sink.desc}`,
      )
      .join('\n\n')
  );
}

export function secretFindingToNormalized(f: SecretFinding): NormalizedFinding {
  return {
    file: f.file,
    startLine: f.line,
    message: `[secret:${f.type}] ${f.preview}`,
    severity: f.confidence === 'high' ? 'high' : 'medium',
    evidence: [
      {
        kind: 'secret' as FindingKind,
        source: 'regex+entropy',
        confidence: f.confidence,
        analyzerVersion: '1.0.0',
      },
    ],
  };
}

export function taintFindingToNormalized(f: TaintFinding): NormalizedFinding {
  const sev = f.sink.risk === 'SQL Injection' || f.sink.risk === 'Command Injection'
    ? 'critical' as Severity
    : f.sink.risk === 'XSS' || f.sink.risk === 'Code Injection'
    ? 'high' as Severity
    : 'medium' as Severity;
  return {
    file: f.file,
    startLine: f.source.line,
    endLine: f.sink.line,
    message: `[taint:${f.sink.risk}] ${f.varName}: ${f.flow}`,
    severity: sev,
    evidence: [
      {
        kind: 'taint' as FindingKind,
        source: 'flow-analysis',
        confidence: 'high',
        analyzerVersion: '1.0.0',
      },
    ],
  };
}
