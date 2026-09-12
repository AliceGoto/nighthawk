import { Readable } from 'node:stream';

import { describe, expect, it, vi } from 'vitest';

import type { ToolExecution } from '../../src/loop';
import {
  parsePackageJson,
  parseRequirementsTxt,
  parseGoMod,
  parseNpmAuditJson,
  DepAuditTool,
} from '../../src/tools/builtin/security/dep-audit.js';
import { createFakeKaos, PERMISSIVE_WORKSPACE } from './fixtures/fake-kaos.js';

/** Run a previously resolved execution, narrowing the ToolExecution union. */
async function runExecution(execution: ToolExecution) {
  if (execution.isError === true) {
    const output =
      typeof execution.output === 'string' ? execution.output : JSON.stringify(execution.output);
    throw new Error(`resolveExecution returned an error: ${output}`);
  }
  return execution.execute({
    turnId: 'test-turn',
    toolCallId: 'test-tool-call',
    signal: new AbortController().signal,
  });
}

describe('parsePackageJson', () => {
  it('detects known-risk lodash 4.17.20', () => {
    const content = JSON.stringify({
      dependencies: { lodash: '4.17.20' },
    });

    const findings = parsePackageJson('/test/package.json', content);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.kind).toBe('known-risk');
    expect(findings[0]!.package).toBe('lodash');
    expect(findings[0]!.version).toBe('4.17.20');
    expect(findings[0]!.cve).toBe('CVE-2020-8203');
  });

  it('detects loose-range *', () => {
    const content = JSON.stringify({
      dependencies: { lodash: '^4.0.0', some: '*' },
    });

    const findings = parsePackageJson('/test/package.json', content);
    const loose = findings.filter(f => f.kind === 'loose-range');
    expect(loose).toHaveLength(1);
    expect(loose[0]!.package).toBe('some');
    expect(loose[0]!.version).toBe('*');
  });

  it('detects postinstall script risk with curl', () => {
    const content = JSON.stringify({
      dependencies: { foo: '1.0.0' },
      scripts: { postinstall: 'curl http://x' },
    });

    const findings = parsePackageJson('/test/package.json', content);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.kind).toBe('script-risk');
    expect(findings[0]!.version).toBe('scripts.postinstall');
  });

  it('no findings for safe deps', () => {
    const content = JSON.stringify({
      dependencies: { qs: '6.13.0', helmet: '8.0.0' },
    });

    const findings = parsePackageJson('/test/package.json', content);
    expect(findings).toHaveLength(0);
  });

  it('scoped package @types/lodash does not match lodash', () => {
    const content = JSON.stringify({
      dependencies: { '@types/lodash': '4.14.182' },
    });

    const findings = parsePackageJson('/test/package.json', content);
    expect(findings).toHaveLength(0);
  });
});

describe('parseRequirementsTxt', () => {
  it('detects known-risk pyyaml 4.0', () => {
    const content = 'pyyaml==4.0\n';

    const findings = parseRequirementsTxt(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.kind).toBe('known-risk');
    expect(findings[0]!.package).toBe('pyyaml');
    expect(findings[0]!.version).toBe('4.0');
  });

  it('no findings for safe flask 3.0', () => {
    const content = 'flask==3.0\n';

    const findings = parseRequirementsTxt(content);
    expect(findings).toHaveLength(0);
  });
});

describe('parseGoMod', () => {
  it('detects pseudo-version', () => {
    const content = 'require github.com/foo/bar v0.0.0-20240101120000-abcdef123456\n';

    const findings = parseGoMod(content);
    const pseudo = findings.filter(f => f.kind === 'pseudo-version');
    expect(pseudo).toHaveLength(1);
    expect(pseudo[0]!.package).toBe('github.com/foo/bar');
    expect(pseudo[0]!.version).toBe('0.0.0-20240101120000-abcdef123456');
  });

  it('no findings for safe version v1.2.3', () => {
    const content = 'require github.com/foo/bar v1.2.3\n';

    const findings = parseGoMod(content);
    expect(findings).toHaveLength(0);
  });
});

describe('DepAuditTool with OSV client', () => {
  function makeKaosWithPackageJson(pkgContent: string) {
    return createFakeKaos({
      stat: async (p: string) => {
        if (p.endsWith('package.json')) return { stMode: 0o100644 } as any;
        throw new Error('not found');
      },
      readText: async (p: string) => {
        if (p.endsWith('package.json')) return pkgContent;
        throw new Error('not found');
      },
    });
  }

  it('merges offline and OSV findings', async () => {
    const pkgJson = JSON.stringify({ dependencies: { lodash: '4.17.20' } });
    const kaos = makeKaosWithPackageJson(pkgJson);

    const mockOsvClient = {
      queryBatch: vi.fn().mockResolvedValue([
        [
          {
            id: 'GHSA-jf85-cpcp-j695',
            summary: 'Prototype Pollution in lodash',
            aliases: ['CVE-2020-8203'],
            severity: '7.5',
            affected: [
              {
                ranges: [{ events: [{ fixed: '4.17.21' }] }],
              },
            ],
          },
        ],
      ]),
    };

    const tool = new DepAuditTool(kaos, PERMISSIVE_WORKSPACE, mockOsvClient);
    const execution = tool.resolveExecution({});
    const result = await runExecution(execution);
    const output = result.output as string;

    expect(output).toContain('offline risk(s) found');
    expect(output).toContain('CVE(s) found via OSV');
    expect(output).toContain('4.17.21');
    expect(mockOsvClient.queryBatch).toHaveBeenCalledOnce();

    const queries = mockOsvClient.queryBatch.mock.calls[0]![0] as any[];
    expect(queries).toHaveLength(1);
    expect(queries[0]!.package.ecosystem).toBe('npm');
    expect(queries[0]!.version).toBe('4.17.20');
  });

  it('degrades gracefully when OSV client fails', async () => {
    const pkgJson = JSON.stringify({ dependencies: { express: '4.18.0' } });
    const kaos = makeKaosWithPackageJson(pkgJson);

    const mockOsvClient = {
      queryBatch: vi.fn().mockRejectedValue(new Error('network error')),
    };

    const tool = new DepAuditTool(kaos, PERMISSIVE_WORKSPACE, mockOsvClient);
    const execution = tool.resolveExecution({});
    const result = await runExecution(execution);
    const output = result.output as string;

    expect(result.isError).toBe(false);
    expect(output).toContain('Dependency audit:');
    expect(output).toContain('No offline risk patterns found');
    expect(output).not.toContain('CVE(s) found via OSV');
  });

  it('skips OSV when client not provided', async () => {
    const pkgJson = JSON.stringify({ dependencies: { lodash: '4.17.20' } });
    const kaos = makeKaosWithPackageJson(pkgJson);

    const tool = new DepAuditTool(kaos, PERMISSIVE_WORKSPACE);
    const execution = tool.resolveExecution({});
    const result = await runExecution(execution);
    const output = result.output as string;

    expect(output).toContain('offline risk(s) found');
    expect(output).not.toContain('CVE(s) found via OSV');
    expect(output).not.toContain('No CVEs found via OSV');
  });
});

describe('DepAuditTool external audit (useExternal)', () => {
  function makeKaosWithLockfileAndExec(args: string[], stdout: string) {
    const exec = vi.fn().mockResolvedValue({
      stdout: Readable.from([stdout]),
      stderr: Readable.from(['']),
      dispose: vi.fn().mockResolvedValue(undefined),
    });
    const kaos = createFakeKaos({
      stat: async (p: string) => {
        if (p.endsWith('package.json') || p.endsWith('pnpm-lock.yaml')) {
          return { stMode: 0o100644 } as any;
        }
        throw new Error('not found');
      },
      readText: async (p: string) => {
        if (p.endsWith('package.json')) return '{"dependencies":{"lodash":"4.17.20"}}';
        throw new Error('not found');
      },
      exec,
    });
    return { kaos, exec };
  }

  it('runs the package-manager audit tool and merges CVEs', async () => {
    const auditJson = JSON.stringify({
      vulnerabilities: {
        lodash: {
          severity: 'high',
          via: [
            { title: 'Prototype Pollution in lodash', url: 'https://github.com/advisories/GHSA-jf85-cpcp-j695', range: '4.17.21', fixAvailable: { name: 'lodash', version: '4.17.21' } },
          ],
        },
      },
    });
    const { kaos, exec } = makeKaosWithLockfileAndExec(['pnpm', 'audit', '--json'], auditJson);

    const tool = new DepAuditTool(kaos, PERMISSIVE_WORKSPACE);
    const execution = tool.resolveExecution({ useExternal: true });
    const result = await runExecution(execution);
    const output = result.output as string;

    expect(result.isError).toBe(false);
    expect(exec).toHaveBeenCalledOnce();
    expect(exec.mock.calls[0]).toEqual(['pnpm', 'audit', '--json']);
    expect(output).toContain('CVE(s) found via');
    expect(output).toContain('pnpm audit');
    expect(output).toContain('lodash@4.17.21');
    expect(output).toContain('(fix: 4.17.21)');
  });

  it('does not run external tools when useExternal is off', async () => {
    const { kaos, exec } = makeKaosWithLockfileAndExec(['pnpm', 'audit', '--json'], '{}');

    const tool = new DepAuditTool(kaos, PERMISSIVE_WORKSPACE);
    const execution = tool.resolveExecution({});
    const result = await runExecution(execution);
    const output = result.output as string;

    expect(exec).not.toHaveBeenCalled();
    expect(output).not.toContain('CVE(s) found via');
  });

  it('degrades gracefully when the external tool fails', async () => {
    const exec = vi.fn().mockRejectedValue(new Error('command not found'));
    const kaos = createFakeKaos({
      stat: async (p: string) => {
        if (p.endsWith('package.json') || p.endsWith('pnpm-lock.yaml')) {
          return { stMode: 0o100644 } as any;
        }
        throw new Error('not found');
      },
      readText: async (p: string) => {
        if (p.endsWith('package.json')) return '{"dependencies":{"lodash":"4.17.20"}}';
        throw new Error('not found');
      },
      exec,
    });

    const tool = new DepAuditTool(kaos, PERMISSIVE_WORKSPACE);
    const execution = tool.resolveExecution({ useExternal: true });
    const result = await runExecution(execution);
    const output = result.output as string;

    expect(result.isError).toBe(false);
    expect(output).toContain('Dependency audit:');
    expect(output).toContain('No CVEs found via external sources.');
  });
});

describe('parseNpmAuditJson', () => {
  it('parses pnpm audit json into CVE findings', () => {
    const raw = JSON.stringify({
      vulnerabilities: {
        lodash: {
          severity: 'high',
          via: [
            { title: 'Prototype Pollution', url: 'https://github.com/advisories/CVE-2020-8203', range: '4.17.21' },
          ],
        },
      },
    });

    const findings = parseNpmAuditJson(raw, 'pnpm');
    expect(findings).toHaveLength(1);
    expect(findings[0]!.package).toBe('lodash');
    expect(findings[0]!.kind).toBe('cve');
    expect(findings[0]!.source).toBe('external');
    expect(findings[0]!.cve).toBe('CVE-2020-8203');
  });

  it('returns empty for unparseable output', () => {
    expect(parseNpmAuditJson('not json', 'pnpm')).toEqual([]);
  });
});
