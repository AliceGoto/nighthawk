import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { Tool } from '../core/types.js';
import { SKIP_DIRS } from './registry.js';

export const grepCodeTool: Tool = {
  definition: {
    name: 'grep_code', description: 'Search file contents with regex, showing context lines (ripgrep-style).',
    parameters: { type: 'object', properties: {
      pattern: { type: 'string', description: 'Regex pattern' },
      path: { type: 'string', description: 'Search directory (default: .)' },
      include: { type: 'string', description: 'File glob (e.g. *.py)' },
      context: { type: 'number', description: 'Context lines around match (default: 2)' },
      ignore_case: { type: 'boolean', description: 'Case insensitive (default: false)' },
    }, required: ['pattern'] },
  },
  async run(args) {
    const root = path.resolve((args.path as string) || '.');
    const flags = (args.ignore_case ? 'gi' : 'g');
    const re = new RegExp(args.pattern as string, flags);
    const ctx = (args.context as number) ?? 2;
    const include = args.include as string | undefined;
    const results: string[] = [];
    function walk(dir: string) {
      try { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walk(full); continue; }
        if (include && !matchGlob(e.name, include)) continue;
        try {
          const lines = fs.readFileSync(full, 'utf-8').split('\n');
          const matches: number[] = [];
          lines.forEach((l, i) => { re.lastIndex = 0; if (re.test(l)) matches.push(i); });
          if (matches.length) {
            const blocks: string[] = [];
            for (const mi of matches) {
              const start = Math.max(0, mi - ctx); const end = Math.min(lines.length - 1, mi + ctx);
              const block: string[] = [];
              for (let i = start; i <= end; i++) block.push(`  ${i === mi ? '→' : ' '} ${String(i + 1).padStart(4)} │ ${lines[i]}`);
              blocks.push(block.join('\n'));
            }
            results.push(`${full} (${matches.length} matches):\n${blocks.join('\n\n')}`);
          }
        } catch {}
      }} catch {}
    }
    walk(root);
    return results.length ? results.join('\n\n') : 'No matches found.';
  },
};

export const countLinesTool: Tool = {
  definition: {
    name: 'count_lines', description: 'Count lines, words, and characters in files.',
    parameters: { type: 'object', properties: {
      path: { type: 'string', description: 'File or directory path' },
      include: { type: 'string', description: 'File glob filter' },
    }, required: ['path'] },
  },
  async run(args) {
    const p = path.resolve(args.path as string);
    const stat = fs.statSync(p);
    if (stat.isFile()) {
      const c = fs.readFileSync(p, 'utf-8');
      const lines = c.split('\n').length;
      const words = c.split(/\s+/).filter(Boolean).length;
      return `${p}: ${lines} lines, ${words} words, ${c.length} chars`;
    }
    let tl = 0, tw = 0, tc = 0, fc = 0;
    function walk(d: string) {
      try { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
        const f = path.join(d, e.name);
        if (e.isDirectory()) { walk(f); continue; }
        if (args.include && !matchGlob(e.name, args.include as string)) continue;
        const c = fs.readFileSync(f, 'utf-8'); tl += c.split('\n').length; tw += c.split(/\s+/).filter(Boolean).length; tc += c.length; fc++;
      }} catch {}
    }
    walk(p);
    return `${fc} files: ${tl} lines, ${tw} words, ${tc} chars`;
  },
};

export const complexityTool: Tool = {
  definition: {
    name: 'complexity_score', description: 'Calculate cyclomatic complexity for functions in a file.',
    parameters: { type: 'object', properties: {
      path: { type: 'string', description: 'File to analyze' },
    }, required: ['path'] },
  },
  async run(args) {
    const p = path.resolve(args.path as string);
    if (!fs.existsSync(p)) return `Error: File not found: ${p}`;
    const content = fs.readFileSync(p, 'utf-8');
    const lines = content.split('\n');
    const results: string[] = [];
    const branches = /\b(if|else if|elif|else|for|while|switch|case|catch|&&|\|\||\?)\b/g;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (/^\s*(def |function |async function |const .* = .*=>|class )/.test(l) || /^(\s*async\s+)?\w+\s*\(/.test(l)) {
        let cc = 1; let j = i; let depth = 0;
        while (j < Math.min(lines.length, i + 100)) {
          const line = lines[j];
          depth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
          for (const _m of line.matchAll(branches)) cc++;
          if (depth <= 0 && j > i) break;
          j++;
        }
        const label = cc >= 20 ? '🔴 HIGH' : cc >= 10 ? '🟡 MEDIUM' : '🟢 LOW';
        results.push(`  ${label} L${i + 1} CC=${cc}: ${l.slice(0, 80)}`);
      }
    }
    return results.length ? `Complexity analysis (${p}):\n${results.join('\n')}` : 'No functions found.';
  },
};

export const fileHashTool: Tool = {
  definition: {
    name: 'file_hash', description: 'Compute MD5/SHA256 hash of a file. Detects sensitive files.',
    parameters: { type: 'object', properties: {
      path: { type: 'string', description: 'File path' },
      algorithm: { type: 'string', enum: ['md5', 'sha256', 'both'], description: 'Hash algorithm (default: both)' },
    }, required: ['path'] },
  },
  async run(args) {
    const p = path.resolve(args.path as string);
    if (!fs.existsSync(p)) return `Error: File not found: ${p}`;
    const data = fs.readFileSync(p);
    const algo = (args.algorithm as string) || 'both';
    const results: string[] = [`File: ${p}`, `Size: ${data.length} bytes`];
    if (algo === 'md5' || algo === 'both') results.push(`MD5:    ${createHash('md5').update(data).digest('hex')}`);
    if (algo === 'sha256' || algo === 'both') results.push(`SHA256: ${createHash('sha256').update(data).digest('hex')}`);
    const sensitive = ['.env','.pem','.key','id_rsa','.kubeconfig','credentials','.htpasswd'];
    if (sensitive.some(s => p.toLowerCase().includes(s))) results.push('⚠️  WARNING: This appears to be a sensitive file!');
    return results.join('\n');
  },
};

function matchGlob(name: string, pattern: string): boolean {
  const re = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  return re.test(name);
}

export const analysisTools = [grepCodeTool, countLinesTool, complexityTool, fileHashTool];
