// ═══════════════════════════════════════════════════════════════════
// 安全工具链 — semgrep_scan / secret_scan / taint_trace / dep_audit / propose_fix
// ═══════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type { Tool } from '../core/types.js';
import { runScan, formatScanReport } from '../security/scanner.js';
import { scanSecrets } from '../security/secrets.js';
import { taintAnalyze, formatTaint } from '../security/taint.js';
import { RULE_STATS } from '../security/rules.js';

export const semgrepScanTool: Tool = {
  definition: {
    name: 'semgrep_scan',
    description: 'Scan code with built-in security rules (Semgrep-style pattern matching). Supports severity/category filters.',
    parameters: { type: 'object', properties: {
      path: { type: 'string', description: 'File or directory to scan (default: .)' },
      min_severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], description: 'Minimum severity filter' },
      category: { type: 'string', description: 'Filter by category (sqli/xss/cmdi/crypto/auth/ssrf/...)' },
      include: { type: 'string', description: 'File glob filter (e.g. *.py)' },
    } },
  },
  async run(args) {
    const report = await runScan({
      root: (args.path as string) || '.',
      minSeverity: args.min_severity as any,
      categories: args.category ? [args.category as string] : undefined,
      include: args.include as string | undefined,
    });
    return formatScanReport(report);
  },
};

export const secretScanTool: Tool = {
  definition: {
    name: 'secret_scan',
    description: 'Detect hardcoded secrets/credentials: AWS keys, tokens, private keys, JWTs, high-entropy strings.',
    parameters: { type: 'object', properties: {
      path: { type: 'string', description: 'File or directory to scan (default: .)' },
      include: { type: 'string', description: 'File glob filter' },
    } },
  },
  async run(args) {
    const findings = scanSecrets((args.path as string) || '.', args.include as string | undefined);
    if (!findings.length) return 'No secrets found. 未发现硬编码密钥。';
    return `Secret Scan — ${findings.length} finding(s):\n\n` + findings.slice(0, 50).map(f =>
      `${f.confidence === 'high' ? '🔴' : '🟡'} [${f.type}] ${f.file}:${f.line}\n` +
      `   Preview: ${f.preview}  (entropy=${f.entropy})`
    ).join('\n\n');
  },
};

export const taintTraceTool: Tool = {
  definition: {
    name: 'taint_trace',
    description: 'Trace data flow from user input sources to dangerous sinks (taint analysis) in a file.',
    parameters: { type: 'object', properties: {
      path: { type: 'string', description: 'File to analyze' },
    }, required: ['path'] },
  },
  async run(args) {
    const findings = taintAnalyze(path.resolve(args.path as string));
    return formatTaint(findings);
  },
};

export const depAuditTool: Tool = {
  definition: {
    name: 'dep_audit',
    description: 'Audit dependencies for known vulnerabilities (npm audit / pip-audit / go vuln).',
    parameters: { type: 'object', properties: {
      path: { type: 'string', description: 'Project directory (default: .)' },
    } },
  },
  async run(args) {
    const root = path.resolve((args.path as string) || '.');
    const out: string[] = [];
    if (fs.existsSync(path.join(root, 'package-lock.json')) || fs.existsSync(path.join(root, 'yarn.lock'))) {
      out.push(run(() => execSync('npm audit --json 2>/dev/null | head -c 20000', { cwd: root, encoding: 'utf-8', timeout: 60_000 })));
    }
    if (fs.existsSync(path.join(root, 'requirements.txt')) || fs.existsSync(path.join(root, 'pyproject.toml'))) {
      out.push(run(() => execSync('pip-audit -r requirements.txt 2>/dev/null | head -c 10000 || pip-audit 2>/dev/null | head -c 10000', { cwd: root, encoding: 'utf-8', timeout: 60_000 })));
    }
    if (fs.existsSync(path.join(root, 'go.mod'))) {
      out.push(run(() => execSync('go list -m -json all 2>/dev/null | head -c 5000', { cwd: root, encoding: 'utf-8', timeout: 60_000 })));
    }
    if (!out.length) return 'No lockfile/manifest found for audit. 未找到可审计的依赖清单。';
    const joined = out.filter(Boolean).join('\n\n---\n\n');
    try { const j = JSON.parse(joined); return summarizeNpmAudit(j); } catch { return joined.slice(0, 15000); }
  },
};

export const proposeFixTool: Tool = {
  definition: {
    name: 'propose_fix',
    description: 'Generate a fix suggestion for a security finding at file:line with rule context.',
    parameters: { type: 'object', properties: {
      path: { type: 'string', description: 'File containing the issue' },
      line: { type: 'number', description: 'Line number of the finding' },
      rule_id: { type: 'string', description: 'Rule ID from scan result' },
    }, required: ['path', 'line'] },
  },
  async run(args) {
    const p = path.resolve(args.path as string);
    if (!fs.existsSync(p)) return `Error: File not found: ${p}`;
    const line = args.line as number;
    const lines = fs.readFileSync(p, 'utf-8').split('\n');
    const ctx = lines.slice(Math.max(0, line - 4), Math.min(lines.length, line + 3))
      .map((l, i) => `${String(Math.max(1, line - 3) + i).padStart(4)} ${Math.max(1, line - 3) + i === line ? '→' : ' '} │ ${l}`).join('\n');
    const report = await runScan({ root: p });
    const hit = report.results.find(r => r.line === line) || report.results.find(r => Math.abs(r.line - line) <= 2);
    const rule = hit?.rule;
    return [
      `Fix proposal for ${p}:${line}`,
      rule ? `Rule: ${rule.id} — ${rule.name} (${rule.cwe || 'N/A'}) [${rule.severity}]` : 'Rule: direct analysis',
      '', 'Context:', ctx, '',
      'Recommendation:', rule ? rule.fixZh : 'Review the flagged line, validate/sanitize the input, and use safe APIs.',
      '', 'Suggested patch strategy:',
      '1. Identify the untrusted data source reaching this line',
      '2. Apply validation (allowlist) or sanitization at the boundary',
      '3. Replace the dangerous API with a safe equivalent',
      '4. Add a regression test for the vulnerable input',
    ].join('\n');
  },
};

export const rulesTool: Tool = {
  definition: {
    name: 'list_rules',
    description: 'List built-in security rules with counts by category and severity.',
    parameters: { type: 'object', properties: {
      category: { type: 'string', description: 'Filter by category' },
      severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
    } },
  },
  async run(args) {
    const s = RULE_STATS;
    const cat = args.category as string | undefined;
    let body = Object.entries(s.byCategory).map(([k, n]) => `  ${k.padEnd(16)} ${n}`).join('\n');
    if (cat) { const { SECURITY_RULES } = await import('../security/rules.js'); body = SECURITY_RULES.filter(r => r.category === cat && (!args.severity || r.severity === args.severity)).map(r => `  ${r.id} ${r.severity.padEnd(9)} ${r.name}`).join('\n') || 'No rules match.'; }
    return `Security Rules: ${s.total} total\n\nBy category:\n${body}\n\nBy severity:\n${Object.entries(s.bySeverity).map(([k, n]) => `  ${k.padEnd(10)} ${n}`).join('\n')}`;
  },
};

function run(fn: () => string): string { try { return fn(); } catch (e: any) { return `Audit tool unavailable: ${e.message?.slice(0, 200) || e}`; } }

function summarizeNpmAudit(j: any): string {
  if (!j?.metadata?.vulnerabilities) return JSON.stringify(j).slice(0, 5000);
  const v = j.metadata.vulnerabilities;
  const head = `npm audit: ${v.total} vulnerabilities — critical:${v.critical} high:${v.high} moderate:${v.moderate} low:${v.low}`;
  const advisories = Object.values(j.vulnerabilities || {}).slice(0, 20).map((a: any) =>
    `🔴 [${a.severity}] ${a.name} ${a.range} — ${a.title}\n   Fix: ${a.fixAvailable === true ? 'available' : JSON.stringify(a.fixAvailable)}`
  ).join('\n');
  return `${head}\n\n${advisories}`;
}

export const securityTools = [semgrepScanTool, secretScanTool, taintTraceTool, depAuditTool, proposeFixTool, rulesTool];
