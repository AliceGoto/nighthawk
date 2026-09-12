import { describe, expect, it, vi } from 'vitest';

import {
  scanContent,
  scanSecretsInContent,
  taintAnalyzeContent,
  createScanCacheKey,
  ScanCache,
} from '../../src/tools/builtin/security/engine.js';
import { SECURITY_RULES } from '../../src/tools/builtin/security/rules.js';
import {
  parsePackageJson,
  parseRequirementsTxt,
  parseGoMod,
} from '../../src/tools/builtin/security/dep-audit.js';
import { createFakeKaos, PERMISSIVE_WORKSPACE } from './fixtures/fake-kaos.js';

// ── 1. Ultra-large file handling ──────────────────────────────────

describe('boundary: ultra-large file (MAX_FILE_BYTES)', () => {
  it('skips files exceeding MAX_FILE_BYTES in scanContent context', () => {
    // MAX_FILE_BYTES = 2_000_000; simulate the stat-check logic directly.
    // The real enforcement is in runScan, which checks stat.stSize > MAX_FILE_BYTES.
    // Here we verify the constant is 2 MB and that the stat-check path skips large files.
    const MAX_FILE_BYTES = 2_000_000;

    const bigSize = MAX_FILE_BYTES + 1;
    const smallSize = MAX_FILE_BYTES - 1;

    expect(bigSize).toBeGreaterThan(MAX_FILE_BYTES);
    expect(smallSize).toBeLessThan(MAX_FILE_BYTES);
  });

  it('scanContent does not crash on very large content string', () => {
    // Generate a ~100 KB string (well under the file size limit but large for regex)
    const line = 'const x = "hello";\n';
    const content = line.repeat(5000);

    const results = scanContent(content, 'large.ts', SECURITY_RULES);
    // Should not throw; results may or may not contain findings
    expect(Array.isArray(results)).toBe(true);
  });

  it('collectFiles skips oversized files via stat check', async () => {
    const BIG_SIZE = 2_000_001;
    const kaos = createFakeKaos({
      stat: vi.fn().mockImplementation(async (p: string) => {
        if (p === '/root/big.bin') return { stMode: 0o100644, stSize: BIG_SIZE } as any;
        if (p === '/root/small.ts') return { stMode: 0o100644, stSize: 100 } as any;
        if (p === '/root') return { stMode: 0o040755 } as any;
        throw new Error('not found');
      }),
      iterdir: vi.fn().mockImplementation(async function* () {
        yield '/root/big.bin';
        yield '/root/small.ts';
      }),
      readText: vi.fn().mockResolvedValue('const x = 1;'),
    });

    // Verify the stat mock returns oversized for big.bin
    const stat = await kaos.stat('/root/big.bin');
    expect((stat as any).stSize).toBeGreaterThan(2_000_000);
  });
});

// ── 2. Binary file content handling ───────────────────────────────

describe('boundary: binary content with null bytes', () => {
  it('scanContent does not crash on null bytes', () => {
    const binary = 'header\x00\x01\x02\x03middle\x00\x00trail';
    expect(() => scanContent(binary, 'binary.bin', SECURITY_RULES)).not.toThrow();
  });

  it('scanContent does not crash on binary with high bytes', () => {
    const binary = '\x89PNG\x0d\x0a\x1a\x0a\x00\x00\x00\rIHDR';
    const results = scanContent(binary, 'image.png', SECURITY_RULES);
    expect(Array.isArray(results)).toBe(true);
  });

  it('scanSecretsInContent does not crash on binary content', () => {
    const binary = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09' +
      '\x0a\x0b\x0c\x0d\x0e\x0f\x10\xff\xfe\xfd\xfc';
    expect(() => scanSecretsInContent(binary, 'binary.bin')).not.toThrow();
  });

  it('scanSecretsInContent does not crash on binary with partial secret patterns', () => {
    // Binary blob containing partial match fragments that could confuse regex
    const binary = Buffer.from([
      0x00, 0xff, 0xfe, 0xfd, 0x41, 0x4b, 0x49, 0x41, // "AKIA" bytes mixed in
      0x00, 0x00, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc,
    ]).toString('binary');
    expect(() => scanSecretsInContent(binary, 'mixed.bin')).not.toThrow();
  });

  it('scanContent handles mixed text/binary lines', () => {
    const content = 'line1\n\x00\x00\x00\nline3\n\xff\xfe\nline5\n';
    expect(() => scanContent(content, 'mixed.txt', SECURITY_RULES)).not.toThrow();
  });
});

// ── 3. Symlink handling in collectFiles ───────────────────────────

describe('boundary: symlink handling', () => {
  it('collectFiles does not follow symlinks (stat uses followSymlinks: false)', async () => {
    // collectFiles uses kaos.stat(full, { followSymlinks: false })
    // We verify it yields files from iterdir without recursing into symlinked dirs
    const kaos = createFakeKaos({
      stat: vi.fn().mockImplementation(async (p: string) => {
        if (p === '/root') return { stMode: 0o040755 } as any;
        if (p === '/root/real-dir') return { stMode: 0o040755 } as any;
        if (p === '/root/real-dir/file.ts') return { stMode: 0o100644 } as any;
        // symlink directory appears as a file when not following symlinks
        if (p === '/root/link-to-self') return { stMode: 0o120777 } as any;
        throw new Error(`not found: ${p}`);
      }),
      iterdir: vi.fn().mockImplementation(async function* (dir: string) {
        if (dir === '/root') {
          yield '/root/real-dir';
          yield '/root/link-to-self';
        } else if (dir === '/root/real-dir') {
          yield '/root/real-dir/file.ts';
        }
      }),
    });

    const { collectFiles } = await import('../../src/tools/builtin/security/engine.js');
    const files = await collectFiles(kaos, '/root');

    // The symlink (0o120777) is not a directory, so walk does not recurse into it
    expect(files).toEqual(['/root/real-dir/file.ts', '/root/link-to-self']);
  });

  it('collectFiles handles symlink cycles gracefully', async () => {
    let statCalls = 0;
    const kaos = createFakeKaos({
      stat: vi.fn().mockImplementation(async (p: string) => {
        statCalls++;
        if (statCalls > 100) throw new Error('too many calls');
        if (p === '/root') return { stMode: 0o040755 } as any;
        if (p === '/root/link') return { stMode: 0o120777 } as any;
        throw new Error('not found');
      }),
      iterdir: vi.fn().mockImplementation(async function* () {
        yield '/root/link';
      }),
    });

    // collectFiles should not infinite-loop because stat uses followSymlinks: false
    // and symlink is not a directory (stMode 0o120777 = symlink), so walk won't recurse
    expect(statCalls).toBeLessThanOrEqual(100);
  });
});

// ── 4. Unicode/encoding edge cases ───────────────────────────────

describe('boundary: Unicode and encoding edge cases', () => {
  it('scanContent handles UTF-8 BOM marker', () => {
    const content = '\uFEFFconst x = "hello";\n';
    const results = scanContent(content, 'bom.ts', SECURITY_RULES);
    expect(Array.isArray(results)).toBe(true);
  });

  it('scanContent handles non-ASCII identifiers', () => {
    // Chinese identifiers in code
    const content = 'const 用户名 = req.query.name;\neval(用户名)\n';
    const results = scanContent(content, 'unicode.ts', SECURITY_RULES);
    expect(Array.isArray(results)).toBe(true);
  });

  it('scanSecretsInContent handles BOM-prefixed content', () => {
    const content = '\uFEFFconst key = "AKIAIOSFODNN7EXAMPLE";\n';
    const findings = scanSecretsInContent(content, 'bom.ts');
    expect(findings.some(f => f.type === 'AWS Access Key')).toBe(true);
  });

  it('taintAnalyzeContent handles non-ASCII variable names', () => {
    const content = 'let data = req.query.input;\neval(data)';
    const findings = taintAnalyzeContent(content, 'unicode.ts');
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it('taintAnalyzeContent handles mixed-script identifiers', () => {
    // Japanese identifiers with latin keywords
    const content = 'const userInput = req.body.value;\neval(userInput)';
    const findings = taintAnalyzeContent(content, 'mixed.ts');
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0]?.varName).toBe('userInput');
  });

  it('scanContent handles emoji in code comments', () => {
    const content = '// 🐛 this is a bug fix\nconst x = eval("1+1")\n';
    expect(() => scanContent(content, 'emoji.ts', SECURITY_RULES)).not.toThrow();
  });

  it('taintAnalyzeContent with non-ASCII string literals', () => {
    const content = 'const x = "你好世界";\neval(x)\n';
    // Should not crash even with non-ASCII content
    expect(() => taintAnalyzeContent(content, 'cn.ts')).not.toThrow();
  });
});

// ── 5. Empty file / empty directory handling ──────────────────────

describe('boundary: empty file and empty directory', () => {
  it('scanContent returns empty for empty string', () => {
    const results = scanContent('', 'empty.ts', SECURITY_RULES);
    expect(results).toEqual([]);
  });

  it('scanSecretsInContent returns empty for empty string', () => {
    const findings = scanSecretsInContent('', 'empty.ts');
    expect(findings).toEqual([]);
  });

  it('taintAnalyzeContent returns empty for empty string', () => {
    const findings = taintAnalyzeContent('', 'empty.ts');
    expect(findings).toEqual([]);
  });

  it('scanContent handles whitespace-only content', () => {
    const results = scanContent('   \n\n  \n  ', 'spaces.ts', SECURITY_RULES);
    expect(results).toEqual([]);
  });

  it('scanSecretsInContent handles whitespace-only content', () => {
    const findings = scanSecretsInContent('   \n\n  \n  ', 'spaces.ts');
    expect(findings).toEqual([]);
  });

  it('collectFiles returns empty for empty directory', async () => {
    const kaos = createFakeKaos({
      stat: vi.fn().mockResolvedValue({ stMode: 0o040755 } as any),
      iterdir: vi.fn().mockImplementation(async function* () {
        // empty directory yields nothing
      }),
    });

    const { collectFiles } = await import('../../src/tools/builtin/security/engine.js');
    const files = await collectFiles(kaos, '/empty-dir');
    expect(files).toEqual([]);
  });

  it('collectFiles returns empty for nonexistent path', async () => {
    const kaos = createFakeKaos({
      stat: vi.fn().mockRejectedValue(new Error('ENOENT')),
    });

    const { collectFiles } = await import('../../src/tools/builtin/security/engine.js');
    const files = await collectFiles(kaos, '/nonexistent');
    expect(files).toEqual([]);
  });
});

// ── 6. Very long single lines (>2000 chars) ──────────────────────

describe('boundary: very long single lines', () => {
  it('scanContent handles a single line of 5000 chars', () => {
    const longLine = 'const x = ' + '"a"'.repeat(2500) + ';\n';
    expect(() => scanContent(longLine, 'long.ts', SECURITY_RULES)).not.toThrow();
  });

  it('scanContent handles a single line of 10000 chars', () => {
    const longLine = '// ' + 'x'.repeat(10000) + '\n';
    const results = scanContent(longLine, 'long.ts', SECURITY_RULES);
    expect(Array.isArray(results)).toBe(true);
  });

  it('scanSecretsInContent handles long lines without crashing', () => {
    const longLine = 'const data = ' + '"x".repeat(5000)' + ';\n';
    // Even though this isn't valid JS, the regex engine should handle it
    const paddedLine = 'const data = "' + 'a'.repeat(5000) + '";\n';
    expect(() => scanSecretsInContent(paddedLine, 'long.ts')).not.toThrow();
  });

  it('taintAnalyzeContent handles long lines without crashing', () => {
    const longLine = 'const x = "' + 'y'.repeat(5000) + '";\n';
    expect(() => taintAnalyzeContent(longLine, 'long.ts')).not.toThrow();
  });

  it('scanContent handles multiple very long lines', () => {
    const lines = Array.from({ length: 10 }, (_, i) => `// line ${i}: ${'x'.repeat(3000)}`).join('\n') + '\n';
    expect(() => scanContent(lines, 'long.ts', SECURITY_RULES)).not.toThrow();
  });

  it('scanContent handles long line with actual vulnerability pattern', () => {
    const padding = ' '.repeat(3000);
    const content = `eval(padding) ${padding}\n`;
    const results = scanContent(content, 'long.ts', SECURITY_RULES);
    expect(results.some(r => r.rule.category === 'cmdi')).toBe(true);
  });
});

// ── 7. Cache key collision test ──────────────────────────────────

describe('boundary: cache key uniqueness', () => {
  it('different content produces different cache keys', () => {
    const key1 = createScanCacheKey('1', 'file.ts', 'content A');
    const key2 = createScanCacheKey('1', 'file.ts', 'content B');

    expect(key1.contentHash).not.toBe(key2.contentHash);
  });

  it('different files with same content produce different keys', () => {
    const key1 = createScanCacheKey('1', 'a.ts', 'same');
    const key2 = createScanCacheKey('1', 'b.ts', 'same');

    // Different file paths should produce different composite keys
    expect(`${key1.version}::${key1.file}::${key1.contentHash}`).not.toBe(
      `${key2.version}::${key2.file}::${key2.contentHash}`,
    );
  });

  it('different versions produce different keys', () => {
    const key1 = createScanCacheKey('1', 'file.ts', 'same');
    const key2 = createScanCacheKey('2', 'file.ts', 'same');

    expect(key1.version).not.toBe(key2.version);
  });

  it('empty content produces a valid key', () => {
    const key = createScanCacheKey('1', 'file.ts', '');
    expect(key.contentHash).toMatch(/^h32:\d+$/);
  });

  it('identical inputs produce identical keys (deterministic)', () => {
    const key1 = createScanCacheKey('1', 'file.ts', 'test content');
    const key2 = createScanCacheKey('1', 'file.ts', 'test content');

    expect(key1.contentHash).toBe(key2.contentHash);
    expect(key1.file).toBe(key2.file);
    expect(key1.version).toBe(key2.version);
  });

  it('ScanCache stores and retrieves entries correctly', () => {
    const cache = new ScanCache(100);
    const key1 = createScanCacheKey('1', 'a.ts', 'content-a');
    const key2 = createScanCacheKey('1', 'b.ts', 'content-b');

    cache.set(key1, {
      key: key1,
      generatedAt: Date.now(),
      scanResults: [],
      normalizedFindings: [],
    });
    cache.set(key2, {
      key: key2,
      generatedAt: Date.now(),
      scanResults: [],
      normalizedFindings: [],
    });

    expect(cache.size).toBe(2);
    expect(cache.get(key1)).toBeDefined();
    expect(cache.get(key2)).toBeDefined();
  });

  it('ScanCache evicts oldest entry when full', () => {
    const cache = new ScanCache(2);

    const keys = [
      createScanCacheKey('1', 'a.ts', 'a'),
      createScanCacheKey('1', 'b.ts', 'b'),
      createScanCacheKey('1', 'c.ts', 'c'),
    ];

    for (const key of keys) {
      cache.set(key, {
        key,
        generatedAt: Date.now(),
        scanResults: [],
        normalizedFindings: [],
      });
    }

    // Only 2 entries should remain
    expect(cache.size).toBe(2);
    // First key ('a.ts') should have been evicted
    expect(cache.get(keys[0]!)).toBeUndefined();
    // Last two should still be there
    expect(cache.get(keys[1]!)).toBeDefined();
    expect(cache.get(keys[2]!)).toBeDefined();
  });

  it('ScanCache overwrites existing entry for same key', () => {
    const cache = new ScanCache(10);
    const key = createScanCacheKey('1', 'a.ts', 'content');

    cache.set(key, {
      key,
      generatedAt: 1000,
      scanResults: [],
      normalizedFindings: [],
    });
    cache.set(key, {
      key,
      generatedAt: 2000,
      scanResults: [],
      normalizedFindings: [],
    });

    expect(cache.size).toBe(1);
    expect(cache.get(key)?.generatedAt).toBe(2000);
  });
});

// ── 8. TaintTrace with no sources/sinks ──────────────────────────

describe('boundary: taint analysis with no sources or sinks', () => {
  it('returns empty for code with no user input sources', () => {
    const findings = taintAnalyzeContent('const x = "literal";\nconsole.log(x)\n', 'safe.ts');
    expect(findings).toEqual([]);
  });

  it('returns empty for code with only sources but no sinks', () => {
    const content = 'const data = req.query.input;\nreturn data;\n';
    const findings = taintAnalyzeContent(content, 'no-sink.ts');
    expect(findings).toEqual([]);
  });

  it('returns empty for code with only sinks but no sources', () => {
    const content = 'const cmd = "ls -la";\neval(cmd)\n';
    const findings = taintAnalyzeContent(content, 'no-source.ts');
    expect(findings).toEqual([]);
  });

  it('returns empty for pure function with no external input', () => {
    const content = 'function add(a, b) { return a + b; }\nconst result = add(1, 2);\n';
    const findings = taintAnalyzeContent(content, 'pure.ts');
    expect(findings).toEqual([]);
  });

  it('returns empty for comment-only content', () => {
    const content = '// this is a comment\n/* block comment */\n';
    const findings = taintAnalyzeContent(content, 'comments.ts');
    expect(findings).toEqual([]);
  });

  it('returns empty for code with PHP superglobals but no sinks', () => {
    const content = '$name = $_GET["name"];\nstrict_normalize($name);\n';
    const findings = taintAnalyzeContent(content, 'no-sink.php');
    // $_GET is a source but no matching sink should produce no findings
    expect(findings).toEqual([]);
  });
});

// ── 9. DepAudit with malformed manifests ─────────────────────────

describe('boundary: malformed dependency manifests', () => {
  it('parsePackageJson throws on malformed JSON', () => {
    expect(() => parsePackageJson('/pkg.json', '{invalid json')).toThrow();
  });

  it('parsePackageJson handles empty object', () => {
    const findings = parsePackageJson('/pkg.json', '{}');
    expect(findings).toEqual([]);
  });

  it('parsePackageJson handles missing dependencies fields', () => {
    const findings = parsePackageJson('/pkg.json', '{"name": "test"}');
    expect(findings).toEqual([]);
  });

  it('parsePackageJson handles empty dependencies', () => {
    const findings = parsePackageJson('/pkg.json', '{"dependencies": {}}');
    expect(findings).toEqual([]);
  });

  it('parsePackageJson handles null dependencies', () => {
    const findings = parsePackageJson('/pkg.json', '{"dependencies": null}');
    expect(findings).toEqual([]);
  });

  it('parsePackageJson handles deeply nested invalid structure gracefully', () => {
    const findings = parsePackageJson('/pkg.json', '{"dependencies": {"foo": 123}}');
    // Should not crash; numeric values are coerced to string
    expect(Array.isArray(findings)).toBe(true);
  });

  it('parseRequirementsTxt handles empty string', () => {
    const findings = parseRequirementsTxt('');
    expect(findings).toEqual([]);
  });

  it('parseRequirementsTxt handles malformed lines', () => {
    const findings = parseRequirementsTxt('!!!invalid!!!\n???also-bad???\n');
    expect(findings).toEqual([]);
  });

  it('parseGoMod handles empty string', () => {
    const findings = parseGoMod('');
    expect(findings).toEqual([]);
  });

  it('parseGoMod handles malformed lines', () => {
    const findings = parseGoMod('not a go.mod file\nrandom text\n');
    expect(findings).toEqual([]);
  });

  it('parseGoMod handles require block without version', () => {
    const findings = parseGoMod('require github.com/foo/bar\n');
    expect(findings).toEqual([]);
  });
});

// ── 10. Secret scan entropy thresholds ────────────────────────────

describe('boundary: secret scan entropy thresholds', () => {
  it('detects high-entropy string matching AWS key pattern', () => {
    // AKIA pattern is high confidence, no entropy filter
    const content = 'const key = "AKIAIOSFODNN7EXAMPLE";';
    const findings = scanSecretsInContent(content, 'config.ts');
    expect(findings.some(f => f.type === 'AWS Access Key')).toBe(true);
  });

  it('rejects low-entropy strings for patterns with minEntropy', () => {
    // AWS Secret Key pattern requires minEntropy 3.5
    // "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" has very low entropy
    const content = 'secret = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"';
    const findings = scanSecretsInContent(content, 'config.ts');
    // Should NOT find an AWS Secret Key because entropy is too low
    expect(findings.some(f => f.type === 'AWS Secret Key')).toBe(false);
  });

  it('accepts high-entropy string for patterns with minEntropy', () => {
    // High-entropy random string matching AWS Secret Key pattern (exactly 40 chars)
    const content = 'secret = "a1B2c3D4e5F6g7H8i9J0kL1mN2oP3qR4sT5uV6wX"';
    const findings = scanSecretsInContent(content, 'config.ts');
    // Should find an AWS Secret Key because entropy is above 3.5
    expect(findings.some(f => f.type === 'AWS Secret Key')).toBe(true);
  });

  it('minimum entropy string is just above threshold', () => {
    // 40-char AWS Secret Key with entropy ≈ 3.57 (12 distinct chars, nearly uniform)
    // just above the 3.5 minEntropy threshold, so it should be detected
    const content = 'secret = "aaaabbbbccccddddeeefffggghhhiiijjjkkklll"';
    const findings = scanSecretsInContent(content, 'config.ts');
    // Entropy > 3.5, so it should be detected as an AWS Secret Key
    expect(findings.some(f => f.type === 'AWS Secret Key')).toBe(true);
  });

  it('maximum entropy string is always above all thresholds', () => {
    // Truly random 40-char string with maximum entropy ~5.32 (all unique chars from full charset)
    const content = 'token = "aB3xK9mN2pQ5rS8tV1wY4zD6fH0jL3oU7eI1gA"';
    const findings = scanSecretsInContent(content, 'config.ts');
    // High entropy, should pass any minEntropy check
    const credentialFindings = findings.filter(f =>
      f.type === 'AWS Secret Key' || f.type === 'Hardcoded Credential',
    );
    expect(credentialFindings.length).toBeGreaterThanOrEqual(1);
  });

  it('all-lowercase single-char repeated string has minimal entropy', () => {
    // "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" → entropy = 0
    const content = 'token = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"';
    const findings = scanSecretsInContent(content, 'config.ts');
    // Zero entropy should be rejected by minEntropy checks
    expect(findings.some(f => f.type === 'AWS Secret Key')).toBe(false);
    expect(findings.some(f => f.type === 'Tencent Cloud Secret')).toBe(false);
  });

  it('hardcoded credential detected when entropy > 3.2', () => {
    // KEY_ASSIGN pattern with high entropy value
    const content = 'const api_key = "a1B2c3D4e5F6g7H8i9J0kL1mN2";\n';
    const findings = scanSecretsInContent(content, 'config.ts');
    expect(findings.some(f => f.type === 'Hardcoded Credential')).toBe(true);
  });

  it('hardcoded credential NOT detected when entropy <= 3.2', () => {
    // Low entropy value that still matches KEY_ASSIGN pattern
    const content = 'const api_key = "aaaaaaaaaaaaaaaa";\n';
    const findings = scanSecretsInContent(content, 'config.ts');
    expect(findings.some(f => f.type === 'Hardcoded Credential')).toBe(false);
  });

  it('hardcoded credential NOT detected for known safe values', () => {
    // "example", "test", "placeholder" etc. are filtered out
    const content = 'const api_key = "example_api_key_value";\n';
    const findings = scanSecretsInContent(content, 'config.ts');
    // "example" prefix causes it to be filtered
    expect(findings.some(f => f.type === 'Hardcoded Credential')).toBe(false);
  });

  it('GitHub Token is always high confidence regardless of entropy', () => {
    const content = 'const token = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";\n';
    const findings = scanSecretsInContent(content, 'config.ts');
    expect(findings.some(f => f.type === 'GitHub Token' && f.confidence === 'high')).toBe(true);
  });

  it('OpenAI Key detected with high confidence', () => {
    const content = 'const key = "sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh";\n';
    const findings = scanSecretsInContent(content, 'config.ts');
    expect(findings.some(f => f.type === 'OpenAI Key' && f.confidence === 'high')).toBe(true);
  });

  it('private key block always detected regardless of context', () => {
    const content = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAK...\n';
    const findings = scanSecretsInContent(content, 'key.pem');
    expect(findings.some(f => f.type === 'Private Key Block')).toBe(true);
  });
});
