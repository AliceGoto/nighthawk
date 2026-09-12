// ═══════════════════════════════════════════════════════════════════
// Git 工具 — status / diff / log / blame / apply patch
// ═══════════════════════════════════════════════════════════════════
import { execSync } from 'node:child_process';
import path from 'node:path';
import type { Tool } from '../core/types.js';

function git(args: string, cwd = '.'): string {
  try {
    return execSync(`git ${args} 2>&1`, { cwd: path.resolve(cwd), encoding: 'utf-8', timeout: 30_000, maxBuffer: 10 * 1024 * 1024 });
  } catch (e: any) {
    return `Error: ${e.stdout || e.message}`.slice(0, 5000);
  }
}

export const gitStatusTool: Tool = {
  definition: {
    name: 'git_status', description: 'Show git working tree status (porcelain + branch).',
    parameters: { type: 'object', properties: { path: { type: 'string', description: 'Repo path (default: .)' } } },
  },
  async run(args) { return git('status -sb --porcelain=v1', args.path as string); },
};

export const gitDiffTool: Tool = {
  definition: {
    name: 'git_diff', description: 'Show git diff (working tree, staged, or between refs).',
    parameters: { type: 'object', properties: {
      path: { type: 'string' }, staged: { type: 'boolean', description: 'Show staged changes' },
      ref: { type: 'string', description: 'Compare ref (e.g. HEAD~1)' },
      file: { type: 'string', description: 'Limit to file' },
    } },
  },
  async run(args) {
    const parts = ['diff'];
    if (args.staged) parts.push('--cached');
    if (args.ref) parts.push(args.ref as string);
    if (args.file) parts.push('--', args.file as string);
    const out = git(parts.join(' '), args.path as string);
    return out.length > 20000 ? out.slice(0, 20000) + '\n… truncated' : out;
  },
};

export const gitLogTool: Tool = {
  definition: {
    name: 'git_log', description: 'Show git commit log.',
    parameters: { type: 'object', properties: {
      path: { type: 'string' }, n: { type: 'number', description: 'Max commits (default 20)' },
      oneline: { type: 'boolean', description: 'Compact format (default true)' },
      file: { type: 'string', description: 'Limit to file' },
    } },
  },
  async run(args) {
    const n = (args.n as number) || 20;
    const parts = [`log -n ${n}`, args.oneline !== false ? '--oneline --decorate' : '--pretty=format:%h %an %ad %s', args.file ? `-- ${args.file as string}` : ''];
    return git(parts.filter(Boolean).join(' '), args.path as string);
  },
};

export const gitBlameTool: Tool = {
  definition: {
    name: 'git_blame', description: 'Show git blame for a file.',
    parameters: { type: 'object', properties: {
      file: { type: 'string' }, path: { type: 'string' },
      start: { type: 'number' }, end: { type: 'number' },
    }, required: ['file'] },
  },
  async run(args) {
    const range = args.start && args.end ? `-L ${args.start as number},${args.end as number}` : '';
    return git(`blame ${range} -- ${(args.file as string).replace(/["'`]/g, '')} | head -100`, args.path as string);
  },
};

export const gitTools = [gitStatusTool, gitDiffTool, gitLogTool, gitBlameTool];
