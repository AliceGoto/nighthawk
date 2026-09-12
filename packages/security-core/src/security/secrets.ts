// ═══════════════════════════════════════════════════════════════════
// 密钥/凭证扫描 — 已知模式 + 香农熵检测
// ═══════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { SKIP_DIRS } from '../tools/registry.js';

export interface SecretFinding {
  file: string; line: number; type: string; preview: string;
  entropy: number; confidence: 'high' | 'medium';
}

interface SecretPattern { type: string; re: RegExp; confidence: 'high' | 'medium'; minEntropy?: number }

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

const KEY_ASSIGN = /(?:secret|token|key|password|passwd|credential|api_key|apikey|access_key)\s*[=:]\s*["'`]([A-Za-z0-9+/_=-]{16,})["'`]/gi;

function shannonEntropy(s: string): number {
  const freq: Record<string, number> = {};
  for (const c of s) freq[c] = (freq[c] || 0) + 1;
  return Object.values(freq).reduce((e, n) => {
    const p = n / s.length;
    return e - p * Math.log2(p);
  }, 0);
}

export function scanSecretsInContent(content: string, file: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    for (const m of content.matchAll(p.re)) {
      const line = content.slice(0, m.index ?? 0).split('\n').length;
      const ent = shannonEntropy(m[0]);
      if (p.minEntropy && ent < p.minEntropy) continue;
      findings.push({ file, line, type: p.type, preview: mask(m[0]), entropy: +ent.toFixed(2), confidence: p.confidence });
    }
  }
  KEY_ASSIGN.lastIndex = 0;
  for (const m of content.matchAll(KEY_ASSIGN)) {
    const line = content.slice(0, m.index ?? 0).split('\n').length;
    const val = m[1];
    const ent = shannonEntropy(val);
    if (ent > 3.2 && !/^(?:true|false|null|undefined|none|0+|x+|test|example|placeholder|your[_-]?)\w*$/i.test(val)) {
      findings.push({ file, line, type: 'Hardcoded Credential', preview: mask(val), entropy: +ent.toFixed(2), confidence: ent > 4 ? 'high' : 'medium' });
    }
  }
  return findings;
}

export function scanSecrets(root: string, include?: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const r = path.resolve(root);
  if (fs.existsSync(r) && fs.statSync(r).isFile()) {
    return scanSecretsInContent(fs.readFileSync(r, 'utf-8'), r);
  }
  (function walk(dir: string) {
    try {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else {
          if (include && !globMatch(e.name, include)) continue;
          if (fs.statSync(full).size > 2_000_000) continue;
          try {
            const content = fs.readFileSync(full, 'utf-8');
            findings.push(...scanSecretsInContent(content, full));
          } catch {}
        }
      }
    } catch {}
  })(r);
  return findings;
}

function mask(s: string): string {
  if (s.length <= 12) return s.slice(0, 4) + '****';
  return s.slice(0, 8) + '…' + s.slice(-4);
}

function globMatch(name: string, pattern: string): boolean {
  const re = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  return re.test(name);
}
