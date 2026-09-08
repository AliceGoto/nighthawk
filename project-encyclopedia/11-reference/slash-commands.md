# 斜杠命令参考

TUI 内常用 slash 命令。

## 会话

`/new`、`/clear`、`/save`、`/sessions`、`/load`、`/session`。

## 模式

`/plan`、`/yolo`、`/auto`、`/trust`。

## 配置

`/model`、`/provider`、`/mcp-config`、`/theme`、`/lang`。

## 工具

`/compact`、`/undo`、`/export`、`/status`、`/help`、`/quit`。

## 专业实现要点（开发流程视角）

### 需求分析

参考手册要支持用户快速查找参数、命令、API、协议。

### 设计决策

以表格和代码块为主，保持条目化、可复制。

### 实现步骤

从 CLI 定义、protocol schema、SDK 类型和路由源码提取事实。

### 验证方式

运行 `nighthawk --help`、`pnpm doctor` 或对照 schema 测试。

### 维护注意

参考内容随代码变更同步更新。

## 逐函数实现说明

以下按源码文件列出可验证的导出函数/类，并给出实现职责说明。

### apps/nighthawk/src/tui/commands/add-dir.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `handleAddDirCommand` | 8 | `export async function handleAddDirCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleAddDirCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/auth.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `handleLoginCommand` | 31 | `export async function handleLoginCommand(host: SlashCommandHost): Promise<void> {` | `handleLoginCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `resolvePlatformSelection` | 42 | `export async function resolvePlatformSelection(` | `resolvePlatformSelection` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleLogoutCommand` | 198 | `export async function handleLogoutCommand(host: SlashCommandHost): Promise<void> {` | `handleLogoutCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/btw.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `handleBtwCommand` | 6 | `export async function handleBtwCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleBtwCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/complete-args.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `completeLeadingArg` | 23 | `export function completeLeadingArg(` | `completeLeadingArg` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/config.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `currentTuiConfig` | 56 | `export function currentTuiConfig(host: Pick<SlashCommandHost, 'state'>): TuiConfig {` | `currentTuiConfig` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `effectiveModelForHost` | 69 | `export function effectiveModelForHost(host: SlashCommandHost, model: ModelAlias): ModelAlias {` | `effectiveModelForHost` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handlePlanCommand` | 77 | `export async function handlePlanCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handlePlanCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleYoloCommand` | 129 | `export async function handleYoloCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleYoloCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleAutoCommand` | 175 | `export async function handleAutoCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleAutoCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleCompactCommand` | 221 | `export async function handleCompactCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleCompactCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleEditorCommand` | 231 | `export async function handleEditorCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleEditorCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleThemeCommand` | 240 | `export async function handleThemeCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleThemeCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleModelCommand` | 256 | `export async function handleModelCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleModelCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleSecondaryModelCommand` | 270 | `export async function handleSecondaryModelCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleSecondaryModelCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleEffortCommand` | 301 | `export async function handleEffortCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleEffortCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `showModelPicker` | 455 | `export function showModelPicker(host: SlashCommandHost, selectedValue: string = host.state.appState.model): void {` | `showModelPicker` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `showPermissionPicker` | 741 | `export function showPermissionPicker(host: SlashCommandHost): void {` | `showPermissionPicker` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `showUpdatePreferencePicker` | 756 | `export function showUpdatePreferencePicker(host: SlashCommandHost): void {` | `showUpdatePreferencePicker` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `showExperimentsPanel` | 771 | `export async function showExperimentsPanel(host: SlashCommandHost): Promise<void> {` | `showExperimentsPanel` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `applyExperimentalFeatureChanges` | 782 | `export async function applyExperimentalFeatureChanges(` | `applyExperimentalFeatureChanges` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `applyUpdatePreferenceChoice` | 855 | `export async function applyUpdatePreferenceChoice(` | `applyUpdatePreferenceChoice` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `showSettingsSelector` | 908 | `export function showSettingsSelector(host: SlashCommandHost): void {` | `showSettingsSelector` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/copy.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `findLastAssistantText` | 15 | `export function findLastAssistantText(entries: readonly TranscriptEntry[]): string {` | `findLastAssistantText` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleCopyCommand` | 24 | `export async function handleCopyCommand(host: SlashCommandHost): Promise<void> {` | `handleCopyCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/dispatch.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `dispatchInput` | 227 | `export function dispatchInput(host: SlashCommandHost, text: string): void {` | `dispatchInput` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/experimental-flags.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `setExperimentalFeatures` | 10 | `export function setExperimentalFeatures(` | `setExperimentalFeatures` 负责写入或更新状态。 |
| `isExperimentalFlagEnabled` | 17 | `export function isExperimentalFlagEnabled(flag: string \| undefined): boolean {` | `isExperimentalFlagEnabled` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/goal.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `parseGoalCommand` | 86 | `export function parseGoalCommand(rawArgs: string): ParsedGoalCommand {` | `parseGoalCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleGoalCommand` | 131 | `export async function handleGoalCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleGoalCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `goalObjectiveLengthWarning` | 198 | `export function goalObjectiveLengthWarning(text: string): string \| undefined {` | `goalObjectiveLengthWarning` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `createGoal` | 378 | `export async function createGoal(` | `createGoal` 负责创建/构建相关对象或流程。 |

### apps/nighthawk/src/tui/commands/info.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `handleFeedbackCommand` | 35 | `export async function handleFeedbackCommand(host: SlashCommandHost): Promise<void> {` | `handleFeedbackCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `showUsage` | 148 | `export async function showUsage(host: SlashCommandHost): Promise<void> {` | `showUsage` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `showStatusReport` | 165 | `export async function showStatusReport(host: SlashCommandHost): Promise<void> {` | `showStatusReport` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `showMcpServers` | 196 | `export async function showMcpServers(host: SlashCommandHost): Promise<void> {` | `showMcpServers` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/parse.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `parseSlashInput` | 3 | `export function parseSlashInput(input: string): ParsedSlashInput \| null {` | `parseSlashInput` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/pentest-scan.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `handleScanCommand` | 3 | `export async function handleScanCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleScanCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleReconCommand` | 20 | `export async function handleReconCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleReconCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleExploitCommand` | 39 | `export async function handleExploitCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleExploitCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleReportCommand` | 56 | `export async function handleReportCommand(host: SlashCommandHost, _args: string): Promise<void> {` | `handleReportCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/pentest.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `parsePentestCommand` | 8 | `export function parsePentestCommand(rawArgs: string): ParsedPentestCommand {` | `parsePentestCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handlePentestCommand` | 14 | `export async function handlePentestCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handlePentestCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `startPentestMode` | 36 | `export async function startPentestMode(host: SlashCommandHost, target?: string): Promise<void> {` | `startPentestMode` 负责执行核心流程。 |
| `exitPentestMode` | 60 | `export async function exitPentestMode(host: SlashCommandHost): Promise<void> {` | `exitPentestMode` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/plugin-commands.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `pluginCommandName` | 11 | `export function pluginCommandName(pluginId: string, name: string): string {` | `pluginCommandName` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `buildPluginSlashCommands` | 15 | `export function buildPluginSlashCommands(defs: readonly PluginCommandDef[]): PluginSlashCommands {` | `buildPluginSlashCommands` 负责创建/构建相关对象或流程。 |

### apps/nighthawk/src/tui/commands/plugins.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `handlePluginsCommand` | 98 | `export async function handlePluginsCommand(host: SlashCommandHost, rawArgs: string): Promise<void> {` | `handlePluginsCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/prompts.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `promptPlatformSelection` | 22 | `export function promptPlatformSelection(host: SlashCommandHost): Promise<string \| undefined> {` | `promptPlatformSelection` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `promptLogoutProviderSelection` | 38 | `export function promptLogoutProviderSelection(` | `promptLogoutProviderSelection` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `promptFeedbackInput` | 65 | `export function promptFeedbackInput(host: SlashCommandHost): Promise<FeedbackPromptResult \| undefined> {` | `promptFeedbackInput` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `promptFeedbackAttachment` | 93 | `export function promptFeedbackAttachment(` | `promptFeedbackAttachment` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `promptApiKey` | 113 | `export function promptApiKey(` | `promptApiKey` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `promptBaseUrl` | 137 | `export function promptBaseUrl(host: SlashCommandHost, platformName: string): Promise<string \| undefined> {` | `promptBaseUrl` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `promptProviderName` | 160 | `export function promptProviderName(host: SlashCommandHost): Promise<string \| undefined> {` | `promptProviderName` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `promptCatalogProviderSelection` | 179 | `export function promptCatalogProviderSelection(host: SlashCommandHost, catalog: Catalog): Promise<string \| undefined> {` | `promptCatalogProviderSelection` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `promptModelSelectionForOpenPlatform` | 214 | `export async function promptModelSelectionForOpenPlatform(` | `promptModelSelectionForOpenPlatform` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `promptModelSelectionForCatalog` | 235 | `export async function promptModelSelectionForCatalog(` | `promptModelSelectionForCatalog` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `runModelSelector` | 250 | `export function runModelSelector(` | `runModelSelector` 负责执行核心流程。 |

### apps/nighthawk/src/tui/commands/provider.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `handleProviderCommand` | 49 | `export async function handleProviderCommand(host: SlashCommandHost): Promise<void> {` | `handleProviderCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleCatalogProviderAdd` | 162 | `export async function handleCatalogProviderAdd(host: SlashCommandHost): Promise<void> {` | `handleCatalogProviderAdd` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/registry.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `goalArgumentCompletions` | 41 | `export function goalArgumentCompletions(argumentPrefix: string): AutocompleteItem[] \| null {` | `goalArgumentCompletions` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `swarmArgumentCompletions` | 55 | `export function swarmArgumentCompletions(argumentPrefix: string): AutocompleteItem[] \| null {` | `swarmArgumentCompletions` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `towerArgumentCompletions` | 60 | `export function towerArgumentCompletions(argumentPrefix: string): AutocompleteItem[] \| null {` | `towerArgumentCompletions` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `addDirArgumentCompletions` | 65 | `export function addDirArgumentCompletions(argumentPrefix: string): AutocompleteItem[] \| null {` | `addDirArgumentCompletions` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `findBuiltInSlashCommand` | 504 | `export function findBuiltInSlashCommand(commandName: string): BuiltinSlashCommand \| undefined {` | `findBuiltInSlashCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `resolveSlashCommandAvailability` | 511 | `export function resolveSlashCommandAvailability(` | `resolveSlashCommandAvailability` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `sortSlashCommands` | 519 | `export function sortSlashCommands(commands: readonly NighthawkSlashCommand[]): NighthawkSlashCommand[] {` | `sortSlashCommands` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/reload.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `handleReloadTuiCommand` | 9 | `export async function handleReloadTuiCommand(host: SlashCommandHost): Promise<void> {` | `handleReloadTuiCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleReloadCommand` | 17 | `export async function handleReloadCommand(host: SlashCommandHost): Promise<void> {` | `handleReloadCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `applyReloadedTuiConfig` | 55 | `export async function applyReloadedTuiConfig(` | `applyReloadedTuiConfig` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/resolve.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `resolveSlashCommandInput` | 58 | `export function resolveSlashCommandInput(options: ResolveSlashCommandInput): SlashCommandIntent {` | `resolveSlashCommandInput` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `resolveSkillCommand` | 138 | `export function resolveSkillCommand(` | `resolveSkillCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `slashCommandBusyReason` | 145 | `export function slashCommandBusyReason(` | `slashCommandBusyReason` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `slashBusyMessage` | 153 | `export function slashBusyMessage(` | `slashBusyMessage` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `canRestoreSubmittedInput` | 168 | `export function canRestoreSubmittedInput(host: { state: TUIState }): boolean {` | `canRestoreSubmittedInput` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/session.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `handleTitleCommand` | 22 | `export async function handleTitleCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleTitleCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleForkCommand` | 57 | `export async function handleForkCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleForkCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleExportMdCommand` | 127 | `export async function handleExportMdCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleExportMdCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleExportDebugZipCommand` | 171 | `export async function handleExportDebugZipCommand(host: SlashCommandHost): Promise<void> {` | `handleExportDebugZipCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `handleInitCommand` | 197 | `export async function handleInitCommand(host: SlashCommandHost): Promise<void> {` | `handleInitCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### apps/nighthawk/src/tui/commands/skills.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `isUserActivatableSkill` | 12 | `export function isUserActivatableSkill(skill: SkillSummary): boolean {` | `isUserActivatableSkill` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `buildSkillSlashCommands` | 32 | `export function buildSkillSlashCommands(skills: readonly SkillSummary[]): SkillSlashCommands {` | `buildSkillSlashCommands` 负责创建/构建相关对象或流程。 |

### apps/nighthawk/src/tui/commands/swarm.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `handleSwarmCommand` | 15 | `export async function handleSwarmCommand(host: SlashCommandHost, args: string): Promise<void> {` | `handleSwarmCommand` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |


## 核心代码片段

以下片段直接从仓库源码截取，用于展示关键实现形态；完整实现请打开对应文件。

### 来自 `apps/nighthawk/src/tui/commands/add-dir.ts` 的 `handleAddDirCommand`

源码位置：`apps/nighthawk/src/tui/commands/add-dir.ts:8` 附近。

```ts
export async function handleAddDirCommand(host: SlashCommandHost, args: string): Promise<void> {
  const input = args.trim();
  let session = host.session;

  if (input.length === 0 || input.toLowerCase() === 'list') {
    // With no session yet (v2 session-less startup) the pending startup
    // directories live in appState and will be passed to the lazy-created
    // session; reflect them instead of reporting an empty list.
    const additionalDirs = session?.summary?.additionalDirs ?? host.state.appState.additionalDirs;
    if (additionalDirs.length === 0) {
      host.showStatus('No additional directories configured.');
      return;
    }
    host.showStatus(formatAdditionalDirsStatus(additionalDirs));
    return;
  }

  if (session === undefined) {
    if (!host.engineV2) {
      host.showError(NO_ACTIVE_SESSION_MESSAGE);
      return;
    }
    // The path-adding form needs a live session; lazy-create it on first use
    // (the read-only `list`/bare forms above tolerate a missing session).
// ...
```

### 来自 `apps/nighthawk/src/tui/commands/auth.ts` 的 `handleLoginCommand`

源码位置：`apps/nighthawk/src/tui/commands/auth.ts:31` 附近。

```ts
export async function handleLoginCommand(host: SlashCommandHost): Promise<void> {
  const platformId = await promptPlatformSelection(host);
  if (platformId === undefined) return;
  await resolvePlatformSelection(host, platformId);
}

/**
 * Routes a platform selector result to the matching setup flow: the models.dev
 * catalog browser, a custom OpenAI-compatible endpoint, a quick-connect preset,
 * or an open-platform login. Shared by /connect and the catalog-fallback path.
 */
export async function resolvePlatformSelection(
  host: SlashCommandHost,
  platformId: string,
): Promise<void> {
  if (platformId === '__catalog__') {
    const { handleCatalogProviderAdd } = await import('./provider');
    await handleCatalogProviderAdd(host);
    return;
  }

  if (platformId === '__custom__') {
    await handleCustomEndpointLogin(host);
    return;
// ...
```

### 来自 `apps/nighthawk/src/tui/commands/btw.ts` 的 `handleBtwCommand`

源码位置：`apps/nighthawk/src/tui/commands/btw.ts:6` 附近。

```ts
export async function handleBtwCommand(host: SlashCommandHost, args: string): Promise<void> {
  const prompt = args.trim();
  const session = host.session;
  if (host.state.appState.model.trim().length === 0 || session === undefined) {
    host.showError(LLM_NOT_SET_MESSAGE);
    return;
  }
  host.btwPanelController.closeOrCancel();

  try {
    const agentId = await session.startBtw();
    const activations = host.engineV2
      ? extractInlineSkillActivations(prompt, host.skillCommandMap, { includeLeading: true })
      : [];
    host.btwPanelController.open(
      agentId,
      prompt,
      activations.length > 0 ? activations : undefined,
    );
  } catch (error) {
    host.showError(`Failed to start /btw: ${formatErrorMessage(error)}`);
  }
}
```


## 时序/状态图

```mermaid
flowchart LR
    A[入口/调用方] --> B[本文核心模块]
    B --> C[依赖服务/数据层]
    C --> D[输出/事件/持久化]
```

> 图注：`11-reference/slash-commands.md` 的抽象流程；具体参与者与状态以源码和上文函数说明为准。

## 核心实现细节（源码导出）

以下是本文涉及路径中的真实源码导出/结构，帮助你把概念映射到函数、类与方法：

  - `apps/nighthawk/src/tui/commands//` 目录下源码文件示例：
    - `apps/nighthawk/src/tui/commands/add-dir.ts`
    - `apps/nighthawk/src/tui/commands/auth.ts`
    - `apps/nighthawk/src/tui/commands/btw.ts`
    - `apps/nighthawk/src/tui/commands/complete-args.ts`
    - `apps/nighthawk/src/tui/commands/config.ts`
    - `apps/nighthawk/src/tui/commands/copy.ts`
    - `apps/nighthawk/src/tui/commands/dispatch.ts`
    - `apps/nighthawk/src/tui/commands/experimental-flags.ts`
    - `apps/nighthawk/src/tui/commands/goal.ts`
    - `apps/nighthawk/src/tui/commands/index.ts`
    - `apps/nighthawk/src/tui/commands/info.ts`
    - `apps/nighthawk/src/tui/commands/parse.ts`
    - `apps/nighthawk/src/tui/commands/pentest-scan.ts`
    - `apps/nighthawk/src/tui/commands/pentest.ts`
    - `apps/nighthawk/src/tui/commands/personas.ts`
    - `apps/nighthawk/src/tui/commands/plugin-commands.ts`
    - `apps/nighthawk/src/tui/commands/plugins.ts`
    - `apps/nighthawk/src/tui/commands/prompts.ts`
    - `apps/nighthawk/src/tui/commands/provider.ts`
    - `apps/nighthawk/src/tui/commands/registry.ts`
    - `apps/nighthawk/src/tui/commands/reload.ts`
    - `apps/nighthawk/src/tui/commands/resolve.ts`
    - `apps/nighthawk/src/tui/commands/session.ts`
    - `apps/nighthawk/src/tui/commands/skills.ts`
  - `docs/en/reference/slash-commands.md`（非 TS 源码，可直接阅读）

## 证据与代码位置

- `apps/nighthawk/src/tui/commands/`
- `docs/en/reference/slash-commands.md`

> 本文所有路径均相对仓库根目录；引用内容以仓库当前 `HEAD` 为准。
