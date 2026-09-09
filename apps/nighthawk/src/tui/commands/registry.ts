import { readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'pathe';

import type { AutocompleteItem } from '@nighthawk/pi-tui';

import { completeLeadingArg, type ArgCompletionSpec } from './complete-args';
import type { NighthawkSlashCommand, SlashCommandAvailability } from './types';

/** Subcommands offered when autocompleting `/goal <…>`. */
const GOAL_ARG_COMPLETIONS: readonly ArgCompletionSpec[] = [
  { value: 'status', description: 'Show the current goal · 查看当前目标' },
  { value: 'pause', description: 'Pause the active goal · 暂停当前目标' },
  { value: 'resume', description: 'Resume a paused goal · 恢复已暂停的目标' },
  { value: 'cancel', description: 'Cancel and remove the current goal · 取消并移除当前目标' },
  { value: 'replace', description: 'Replace the current goal · 替换当前目标' },
  { value: 'next', description: 'Queue an upcoming goal · 排队下一个目标' },
];

const GOAL_NEXT_ARG_COMPLETIONS: readonly ArgCompletionSpec[] = [
  { value: 'manage', description: 'Manage upcoming goals · 管理排队中的目标' },
];

const SWARM_ARG_COMPLETIONS: readonly ArgCompletionSpec[] = [
  { value: 'on', description: 'Turn swarm mode on · 开启集群模式' },
  { value: 'off', description: 'Turn swarm mode off · 关闭集群模式' },
];

const TOWER_ARG_COMPLETIONS: readonly ArgCompletionSpec[] = [
  { value: 'status', description: 'Report tower status · 查看 Tower 状态' },
  { value: 'teardown', description: 'Tear down the tower · 拆除 Tower' },
  { value: 'on', description: 'Turn tower mode on · 开启 Tower 模式' },
  { value: 'off', description: 'Turn tower mode off · 关闭 Tower 模式' },
];

const ADD_DIR_ARG_COMPLETIONS: readonly ArgCompletionSpec[] = [
  { value: 'list', description: 'Show configured additional workspace directories · 查看已配置的额外工作区目录' },
];

/** Argument autocompletion for the `/goal` command (subcommands). */
export function goalArgumentCompletions(argumentPrefix: string): AutocompleteItem[] | null {
  const nextMatch = argumentPrefix.match(/^next\s+(\S*)$/i);
  if (nextMatch !== null) {
    return (
      completeLeadingArg(GOAL_NEXT_ARG_COMPLETIONS, nextMatch[1] ?? '')?.map((item) => ({
        ...item,
        value: `next ${item.value}`,
      })) ?? null
    );
  }
  return completeLeadingArg(GOAL_ARG_COMPLETIONS, argumentPrefix);
}

/** Argument autocompletion for the `/swarm` command (subcommands). */
export function swarmArgumentCompletions(argumentPrefix: string): AutocompleteItem[] | null {
  return completeLeadingArg(SWARM_ARG_COMPLETIONS, argumentPrefix);
}

/** Argument autocompletion for the `/tower` command (subcommands). */
export function towerArgumentCompletions(argumentPrefix: string): AutocompleteItem[] | null {
  return completeLeadingArg(TOWER_ARG_COMPLETIONS, argumentPrefix);
}

/** Argument autocompletion for the `/add-dir` command. */
export function addDirArgumentCompletions(argumentPrefix: string): AutocompleteItem[] | null {
  if (isPathLikeAddDirArgument(argumentPrefix)) {
    return completeAddDirPath(argumentPrefix);
  }
  return completeLeadingArg(ADD_DIR_ARG_COMPLETIONS, argumentPrefix);
}

function isPathLikeAddDirArgument(argumentPrefix: string): boolean {
  return argumentPrefix === '.' || argumentPrefix === '..' || argumentPrefix.startsWith('./') || argumentPrefix.startsWith('../') || argumentPrefix.startsWith('/') || argumentPrefix.startsWith('~');
}

function completeAddDirPath(argumentPrefix: string): AutocompleteItem[] | null {
  const normalizedPrefix = argumentPrefix === '~' ? '~/' : argumentPrefix;
  const expandedPrefix = expandHomePrefix(normalizedPrefix);
  const parentInput = getDirectoryCompletionParentInput(normalizedPrefix, expandedPrefix);
  const partialName = normalizedPrefix.endsWith('/') ? '' : basename(expandedPrefix);
  const parentDir = resolveDirectoryCompletionParent(parentInput);
  let entries;
  try {
    entries = readdirSync(parentDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const items: AutocompleteItem[] = [];
  for (const entry of entries) {
    if (entry.name === '.' || entry.name === '..' || entry.name.startsWith('.')) continue;
    if (partialName.length > 0 && !entry.name.toLowerCase().startsWith(partialName.toLowerCase())) continue;
    const absolutePath = join(parentDir, entry.name);
    if (!isDirectoryPath(absolutePath, entry.isDirectory(), entry.isSymbolicLink())) continue;
    const value = formatDirectoryCompletionValue(normalizedPrefix, parentInput, entry.name);
    items.push({
      value,
      label: `${entry.name}/`,
      description: absolutePath,
    });
  }

  return items.length > 0 ? items : null;
}

function expandHomePrefix(argumentPrefix: string): string {
  if (argumentPrefix === '~') return homedir();
  if (argumentPrefix.startsWith('~/')) return join(homedir(), argumentPrefix.slice(2));
  return argumentPrefix;
}

function getDirectoryCompletionParentInput(argumentPrefix: string, expandedPrefix: string): string {
  if (argumentPrefix === '/') return '/';
  if (argumentPrefix === '~/') return homedir();
  if (argumentPrefix.endsWith('/')) return expandedPrefix.slice(0, -1);
  return dirname(expandedPrefix);
}

function resolveDirectoryCompletionParent(parentInput: string): string {
  if (parentInput === '~') return homedir();
  if (parentInput.startsWith('~/')) return join(homedir(), parentInput.slice(2));
  return resolve(parentInput);
}

function isDirectoryPath(path: string, isDirectory: boolean, isSymlink: boolean): boolean {
  if (isDirectory) return true;
  if (!isSymlink) return false;
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function formatDirectoryCompletionValue(argumentPrefix: string, parentInput: string, entryName: string): string {
  if (argumentPrefix.startsWith('~/')) {
    const home = homedir();
    const homeRelative = relative(home, parentInput);
    return `~${homeRelative.length > 0 ? `/${homeRelative}` : ''}/${entryName}/`;
  }
  if (argumentPrefix.startsWith('/')) {
    return `${join(parentInput, entryName)}/`;
  }
  return `${join(parentInput, entryName)}/`;
}

export const BUILTIN_SLASH_COMMANDS = [
  {
    name: 'yolo',
    aliases: ['yes'],
    description: 'Toggle YOLO mode: auto-approve tool actions · YOLO 模式：自动批准工具操作',
    priority: 101,
    availability: 'always',
  },
  {
    name: 'auto',
    aliases: [],
    description: 'Toggle Auto mode: fully autonomous · Auto 模式：完全自主，无需确认',
    priority: 99,
    availability: 'always',
  },
  {
    name: 'permission',
    aliases: [],
    description: 'Select permission mode · 选择权限模式',
    priority: 100,
    availability: 'always',
  },
  {
    name: 'settings',
    aliases: ['config'],
    description: 'Open TUI settings · 打开设置',
    priority: 100,
    availability: 'always',
  },
  {
    name: 'plan',
    aliases: [],
    description: 'Toggle plan mode · 切换计划模式',
    priority: 100,
    availability: (args) => (args.trim().toLowerCase() === 'clear' ? 'idle-only' : 'always'),
    normalOnly: true,
  },
  {
    name: 'swarm',
    aliases: [],
    description: 'Toggle swarm mode or run one task in swarm mode · 集群模式：切换或以集群方式执行任务',
    priority: 100,
    argumentHint: '[on|off] | <task>',
    completeArgs: swarmArgumentCompletions,
    availability: 'idle-only',
    normalOnly: true,
  },
  {
    name: 'swarm-status',
    aliases: [],
    description: 'Show swarm sub-task status · 查看集群子任务状态',
    priority: 80,
    availability: 'always',
    normalOnly: true,
  },
  {
    name: 'tower',
    aliases: [],
    description: 'Report tower status, toggle tower mode, or set the tower objective · Tower：查看状态、切换模式或设定目标',
    priority: 100,
    argumentHint: '[status|teardown|on|off] | <objective>',
    completeArgs: towerArgumentCompletions,
    availability: 'always',
    experimentalFlag: 'tower',
    requiresEngineV2: true,
    normalOnly: true,
  },
  {
    name: 'model',
    aliases: [],
    description: 'Switch LLM model · 切换模型',
    priority: 100,
    availability: 'always',
  },
  {
    name: 'secondary-model',
    aliases: ['subagent-model'],
    description: 'Configure the secondary model for subagents · 配置子 Agent 使用的模型',
    priority: 90,
    availability: 'always',
    experimentalFlag: 'secondary-model',
    normalOnly: true,
  },
  {
    name: 'effort',
    aliases: ['thinking'],
    description: 'Switch thinking effort · 切换思考强度',
    priority: 95,
    availability: 'always',
  },
  {
    name: 'provider',
    aliases: ['providers'],
    description: 'Manage AI providers (add / delete / refresh) · 管理模型供应商（添加/删除/刷新）',
    priority: 95,
    availability: 'always',
  },
  {
    name: 'btw',
    aliases: [],
    description: 'Ask a forked side agent a question · 向旁路子 Agent 提问',
    priority: 90,
    availability: 'always',
    normalOnly: true,
  },
  {
    name: 'help',
    aliases: ['h', '?'],
    description: 'Show available commands and shortcuts · 查看可用命令与快捷键',
    priority: 80,
    availability: 'always',
  },
  {
    name: 'new',
    aliases: ['clear'],
    description: 'Start a fresh session in the current workspace · 在当前工作区开启新会话',
    priority: 80,
  },
  {
    name: 'sessions',
    aliases: ['resume'],
    description: 'Browse and resume sessions · 浏览并恢复会话',
    priority: 80,
    normalOnly: true,
  },
  {
    name: 'session',
    aliases: [],
    description: 'Manage sessions - browse, resume, delete (press Delete key in picker) · 管理会话（在列表中按 Delete 删除）',
    priority: 80,
    normalOnly: true,
  },
  {
    name: 'tasks',
    aliases: ['task'],
    description: 'Browse background tasks · 浏览后台任务',
    priority: 80,
    availability: 'always',
    normalOnly: true,
  },
  {
    name: 'mcp',
    aliases: [],
    description: 'Show MCP server status · 查看 MCP 服务器状态',
    priority: 60,
    availability: 'always',
    normalOnly: true,
  },
  {
    name: 'plugins',
    aliases: [],
    description: 'Manage plugins · 管理插件',
    priority: 60,
    availability: 'always',
    normalOnly: true,
  },
  {
    name: 'add-dir',
    aliases: [],
    description: 'Add or list an additional workspace directory · 添加或查看额外工作区目录',
    priority: 60,
    availability: 'idle-only',
    argumentHint: '[list] | <path>',
    completeArgs: addDirArgumentCompletions,
    normalOnly: true,
  },
  {
    name: 'experiments',
    aliases: ['experimental'],
    description: 'Manage experimental features · 管理实验特性',
    priority: 60,
    availability: 'idle-only',
    normalOnly: true,
  },
  {
    name: 'reload',
    aliases: [],
    description: 'Reload session and apply config.toml settings plus tui.toml UI preferences · 重载会话并应用配置',
    priority: 60,
    availability: 'idle-only',
    normalOnly: true,
  },
  {
    name: 'reload-tui',
    aliases: [],
    description: 'Reload only tui.toml UI preferences · 仅重载界面偏好设置',
    priority: 60,
    availability: 'always',
  },
  {
    name: 'compact',
    aliases: [],
    description: 'Compact the conversation context · 压缩对话上下文',
    priority: 80,
    argumentHint: '<instruction>',
  },
  {
    name: 'pentest',
    aliases: ['hack', 'exploit-mode'],
    description: 'Toggle pentest mode · 切换渗透测试模式',
    priority: 85,
    availability: 'always',
    argumentHint: '[<target>]',
  },
  {
    name: 'scan',
    aliases: ['pentest-scan'],
    description: 'Security scan · 安全扫描（渗透模式）',
    priority: 84,
    availability: 'always',
    pentestOnly: true,
  },
  {
    name: 'recon',
    aliases: ['pentest-recon'],
    description: 'Reconnaissance · 信息收集（渗透模式）',
    priority: 84,
    argumentHint: '<target>',
    availability: 'always',
    pentestOnly: true,
  },
  {
    name: 'exploit',
    aliases: ['pentest-exploit'],
    description: 'Exploit analysis · 漏洞利用分析（渗透模式）',
    priority: 84,
    argumentHint: '[finding-id]',
    availability: 'always',
    pentestOnly: true,
  },
  {
    name: 'report',
    aliases: ['pentest-report'],
    description: 'Generate pentest report · 生成渗透测试报告',
    priority: 84,
    availability: 'always',
    pentestOnly: true,
  },
  {
    name: 'trace',
    aliases: ['tracing', 'timeline'],
    description: 'Show session trace timeline · 查看会话追踪时间线',
    priority: 60,
    availability: 'always',
  },
  {
    name: 'goal',
    aliases: [],
    description: 'Start or manage an autonomous goal · 启动或管理自主目标',
    priority: 80,
    argumentHint: '[status|pause|resume|cancel|replace|next] | <objective>',
    completeArgs: goalArgumentCompletions,
    // status / pause / cancel are always available; creation, replacement, and
    // resume start (or restart) a turn and so are idle-only.
    normalOnly: true,
    availability: (args) => {
      const trimmed = args.trim();
      if (trimmed === 'next' || trimmed.startsWith('next ')) return 'always';
      return trimmed === '' || trimmed === 'status' || trimmed === 'pause' || trimmed === 'cancel'
        ? 'always'
        : 'idle-only';
    },
  },
  {
    name: 'init',
    aliases: [],
    description: 'Analyze the codebase and generate AGENTS.md · 分析代码库并生成 AGENTS.md',
  },
  {
    name: 'fork',
    aliases: [],
    description: 'Fork the current session into a copy without switching to it · 复制当前会话（不切换）',
    priority: 80,
  },
  {
    name: 'title',
    aliases: ['rename'],
    description: 'Set or show session title · 设置或查看会话标题',
    priority: 60,
    argumentHint: '<title>',
    availability: 'always',
  },
  {
    name: 'usage',
    aliases: [],
    description: 'Show session tokens + context window + plan quotas · 查看会话 token、上下文窗口与配额',
    priority: 60,
    availability: 'always',
  },
  {
    name: 'status',
    aliases: [],
    description: 'Show current session and runtime status · 查看会话与运行时状态',
    priority: 60,
    availability: 'always',
  },
  {
    name: 'personas',
    aliases: [],
    description: 'List available persona cards · 列出可用角色卡片',
    priority: 60,
    availability: 'always',
    normalOnly: true,
  },
  {
    name: 'feedback',
    aliases: ['bug'],
    description: 'Send feedback to make NightHawk better · 提交反馈',
    priority: 60,
    availability: 'always',
  },
  {
    name: 'undo',
    aliases: [],
    description: 'Withdraw the last prompt from the transcript · 撤回上一条提问',
    priority: 80,
    availability: 'idle-only',
  },
  {
    name: 'editor',
    aliases: [],
    description: 'Set the external editor for Ctrl-G · 设置外部编辑器',
    priority: 60,
    availability: 'always',
  },
  {
    name: 'theme',
    aliases: [],
    description: 'Set the terminal UI theme · 设置终端主题',
    priority: 60,
    availability: 'always',
  },
  {
    name: 'logout',
    aliases: ['disconnect'],
    description: 'Log out of a configured provider · 退出已登录的供应商',
    priority: 40,
  },
  {
    name: 'login',
    aliases: ['connect'],
    description: 'Login to a model provider · 登录模型供应商',
    priority: 40,
  },
  {
    name: 'export-md',
    aliases: ['export'],
    description: 'Export current session as a Markdown file · 导出会话为 Markdown',
    priority: 40,
  },
  {
    name: 'export-debug-zip',
    aliases: [],
    description: 'Export current session as a debug ZIP archive · 导出会话为调试 ZIP 包',
    priority: 40,
  },
  {
    name: 'copy',
    aliases: [],
    description: 'Copy the last assistant message to the clipboard · 复制上一条回复到剪贴板',
    priority: 40,
  },
  {
    name: 'exit',
    aliases: ['quit', 'q'],
    description: 'Exit the application · 退出',
    priority: 20,
  },
  {
    name: 'version',
    aliases: [],
    description: 'Show version information · 查看版本信息',
    priority: 20,
    availability: 'always',
  },
] as const satisfies readonly NighthawkSlashCommand[];

export type BuiltinSlashCommand = (typeof BUILTIN_SLASH_COMMANDS)[number];
export type BuiltinSlashCommandName = BuiltinSlashCommand['name'];

export function findBuiltInSlashCommand(commandName: string): BuiltinSlashCommand | undefined {
  const commands = BUILTIN_SLASH_COMMANDS as readonly NighthawkSlashCommand<BuiltinSlashCommandName>[];
  return commands.find(
    (command) => command.name === commandName || command.aliases.includes(commandName),
  ) as BuiltinSlashCommand | undefined;
}

export function resolveSlashCommandAvailability(
  command: NighthawkSlashCommand,
  args: string,
): SlashCommandAvailability {
  const availability = command.availability ?? 'idle-only';
  return typeof availability === 'function' ? availability(args) : availability;
}

export function sortSlashCommands(commands: readonly NighthawkSlashCommand[]): NighthawkSlashCommand[] {
  return [...commands].toSorted(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.name.localeCompare(b.name),
  );
}
