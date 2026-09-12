#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// Security Coding Agent — CLI 入口
// 交互式 TUI（照搬 nighthawk）/ 无头扫描 / 单次提问
// ═══════════════════════════════════════════════════════════════════
import { Command } from 'commander';
import { loadConfig, getProviderConfig } from '../config/index.js';
import { LLMClient } from '../core/llm/client.js';
import { AgentLoop } from '../core/agent/loop.js';
import { SessionStore } from '../core/session/store.js';
import { createToolRegistry } from '../tools/registry.js';
import { fileTools } from '../tools/file-tools.js';
import { analysisTools } from '../tools/analysis-tools.js';
import { securityTools } from '../tools/security-tools.js';
import { gitTools } from '../tools/git-tools.js';
import { createRunCommandTool } from '../tools/sandbox.js';
import { ScaShell } from '../ui/shell.js';
import { currentTheme } from '../ui/theme.js';
import { t } from '../ui/i18n.js';
import { RULE_STATS } from '../security/rules.js';
import { runScan, formatScanReport } from '../security/scanner.js';
import { buildSlashCommands, dispatchCommand, VERSION, type CommandContext } from './commands.js';
import { buildRagContext } from '../core/rag/index.js';

const program = new Command();
program
  .name('sca')
  .description('Security Coding Agent — NightHawk superset with 116 security rules')
  .version(VERSION)
  .option('-p, --prompt <text>', 'one-shot prompt (headless)')
  .option('--scan [path]', 'headless security scan')
  .option('--sev <severity>', 'min severity for scan', 'low')
  .option('--provider <type>', 'provider: openai_compatible | anthropic | nighthawk')
  .option('--model <model>', 'model override');

program.parse(process.argv);
const opts = program.opts();

const config = loadConfig();
if (opts.provider) config.providerType = opts.provider;
if (opts.model) config.model = opts.model;
currentTheme.set(config.theme);

// ── 工具注册 ──────────────────────────────────────────────────────
function buildRegistry(shellConfirm?: (q: string) => Promise<boolean>) {
  const registry = createToolRegistry();
  for (const tool of [...fileTools, ...analysisTools, ...securityTools, ...gitTools]) registry.register(tool);
  registry.register(createRunCommandTool({
    permissionMode: config.permissionMode,
    workspace: config.workspace,
    onConfirm: shellConfirm,
  }));
  return registry;
}

const SYSTEM_PROMPT = `You are Security Coding Agent (SCA) — a versatile AI coding assistant with deep security expertise. Respond in the user's language (default: Chinese).

## Identity
- General coding assistant first, security expert second
- Handle ALL coding tasks naturally: write code, debug, refactor, explain
- Perform security analysis when asked or when you notice critical issues

## Security Workflow (when auditing)
1. Plan: decompose the audit target, identify entry points
2. Act: use tools (semgrep_scan → secret_scan → taint_trace → read_file) to gather evidence
3. Observe: analyze tool results, correlate findings
4. Reflect: verify each finding is real (no false positives), then report

## Findings Format
For each vulnerability: severity (🔴critical/🟠high/🟡medium/🔵low), file:line, evidence, CWE, and concrete fix.

## Rules
- Use tools to inspect real files; never guess file contents
- Read-only tools can be called in parallel; be efficient
- Wrap up with a clear conclusion when evidence is sufficient`;

function createAgent(registry: ReturnType<typeof buildRegistry>) {
  const providerConfig = getProviderConfig(config);
  const llm = new LLMClient(providerConfig, SYSTEM_PROMPT);
  const loop = new AgentLoop(llm, registry, config.maxTurns);
  return { llm, loop };
}

// ── 无头模式：--scan ──────────────────────────────────────────────
if (opts.scan !== undefined) {
  const target = typeof opts.scan === 'string' ? opts.scan : '.';
  const report = await runScan({ root: target, minSeverity: opts.sev as any });
  console.log(formatScanReport(report, config.lang));
  process.exit(0);
}

// ── 无头模式：-p ─────────────────────────────────────────────────
if (opts.prompt) {
  if (!config.apiKey && config.providerType !== 'anthropic') {
    console.error('Error: AUDIT_AGENT_API_KEY not set'); process.exit(1);
  }
  const registry = buildRegistry();
  const { loop } = createAgent(registry);
  const rag = await buildRagContext(opts.prompt, config.workspace);
  const result = await loop.runTurn(rag ? `${opts.prompt}\n\n${rag}` : opts.prompt, {
    onPhase: p => process.stderr.write(`[${p}] `),
    onToolStart: n => process.stderr.write(`\n→ ${n}`),
  });
  console.log('\n' + result.reply);
  process.exit(0);
}

// ── 交互式 TUI ────────────────────────────────────────────────────
const shell = new ScaShell(buildSlashCommands(), config.workspace);
shell.printBanner();
shell.print(t(config.lang, 'welcome'), 'textMuted');
shell.print(`${RULE_STATS.total} rules · ${buildRegistry().listNames().length} tools · /help`, 'textDim');
if (!config.apiKey && config.providerType !== 'anthropic') {
  shell.print(t(config.lang, 'noApiKey'), 'warning');
}

let registry = buildRegistry((q) => shell.confirm(q));
let { llm, loop } = createAgent(registry);
const store = new SessionStore(config.workspace, config.model, config.providerType);

const ctx: CommandContext = {
  config, loop, llm, registry, store, shell,
  rebuildAgent: () => {
    registry = buildRegistry((q) => shell.confirm(q));
    ({ llm, loop } = createAgent(registry));
    ctx.llm = llm; ctx.loop = loop; ctx.registry = registry;
  },
  exit: () => { shell.stop(); console.log(t(config.lang, 'goodbye')); process.exit(0); },
};

let busy = false;
shell.onSubmit = async (text: string) => {
  if (busy) return;
  busy = true;
  try {
    // 斜杠命令
    if (await dispatchCommand(text, ctx)) { store.checkpoint(store.checkpoints.length, loop.messages); return; }

    // Agent 回合
    if (!config.apiKey && config.providerType !== 'anthropic') {
      shell.print(t(config.lang, 'noApiKey'), 'warning');
      return;
    }
    store.setTitle(text);
    shell.showLoader(t(config.lang, 'thinking'));
    const rag = await loop.enrichWithRag(text, config.workspace);

    const result = await loop.runTurn(rag ? `${text}\n\n${rag}` : text, {
      onToken: (tok) => shell.streamAppend(tok),
      onPhase: (phase) => {
        const labels: Record<string, string> = {
          plan: t(config.lang, 'thinking'), act: t(config.lang, 'toolRunning'),
          observe: t(config.lang, 'observing'), reflect: t(config.lang, 'reflecting'), done: '',
        };
        if (phase === 'plan') shell.streamStart();
        if (labels[phase]) shell.setLoaderLabel(labels[phase]);
      },
      onToolStart: (name) => { shell.setLoaderLabel(`⚙ ${name}`); },
      onToolEnd: (name, result, ok) => {
        shell.setLoaderLabel(t(config.lang, 'thinking'));
        if (!ok) shell.print(`  ⚠ ${name}: ${result.slice(0, 120)}`, 'warning');
      },
    });
    shell.streamEnd();
    shell.hideLoader();
    if (result.interrupted) shell.print(t(config.lang, 'cancelled'), 'warning');
    store.setUsage(llm.tokenUsage);
    store.checkpoint(store.checkpoints.length, loop.messages);
  } catch (e: any) {
    shell.hideLoader();
    shell.print(`Error: ${e.message}`, 'danger');
  } finally {
    busy = false;
  }
};
// 中断（Ctrl+C during busy）
shell.onInterrupt = () => { loop.interrupt(); };

shell.start();
