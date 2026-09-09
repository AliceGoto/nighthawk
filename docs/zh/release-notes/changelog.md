---
outline: 2
---

# 变更记录

本页记录 NightHawk CLI 每个版本的变更内容。

## 0.42.0（2026-09-09）

### 新功能

- 新增 `/session` 命令：浏览和管理所有工作区的会话，`Ctrl+E` 展开会话详情，`Delete` 键确认后删除。
- v2 引擎增强：完整实现渗透测试模式切换、非 main agent 的 Goal 支持、`createSessionWithKaos` / `resumeSessionWithKaos` 的 Kaos 注入适配。
- MCP stdio 新增 kaos executor 支持：可在 stdio MCP server 配置 `executor: 'kaos'`，通过 Kaos 执行器启动子进程。
- ACP 协议增强：支持 `type: 'acp'` 的 MCP transport，以及 Other 内容块自由文本编辑。
- 旧版 CLI 插件迁移支持：`nighthawk migrate` 现可同时迁移旧版 CLI 插件与技能。
- TodoList 新增可选 `priority` 字段（high/medium/low），按优先级排序展示。
- TUI Agent 按描述自动分组：多个 Agent 工具调用自动合并为组，支持按需拆分查看。

### 优化

- TUI 欢迎横幅替换为紧凑渐变 NightHawk 字母标志。
- 发布 Windows、Linux、macOS 无签名原生二进制。
- 改进 ACP AskUserQuestion 校验，更新 ACP 参考文档。

### 修复

- 修复 v2 引擎中 Read 和 Write 工具的参数名兼容问题——`offset`/`count` 和 `file_path` 别名现可正常使用。
- 修复了一些已知问题，并做了若干细节优化。更详细的变更记录见 [GitHub](https://github.com/AliceGoto/nighthawk/blob/main/apps/nighthawk/CHANGELOG.md)。

## 0.41.0（2026-08-30）

### 新功能
- Lobe Chat Web UI 集成：`nighthawk web --port 3000` 启动浏览器聊天界面
- Web UI 聊天界面：侧边栏对话管理、消息气泡、代码高亮
- 插件系统增强：Tool/Profile/Config 注册、热加载、插件 SDK
- 角色卡片系统：`/personas` 命令，AgentSwarm 自动匹配角色
- `/swarm-status` 命令：查看集群子任务实时状态
- 宇宙汤深色主题：太空舱风格像素界面
- 开发者文档：中英文插件开发指南

### 变更
- 去除文档中所有旧品牌/旧供应商字样
- 全平台构建支持：Windows/Linux/macOS 原生二进制
- TUI Logo 恢复为 NH 紧凑字母，带渐变动画

### 修复
- Ctrl+C 正常退出 web 服务

## 0.40.0（2026-08-28）

### 新功能
- 新增 `/trace` 命令：查看会话追踪时间线，显示每个回合的耗时、工具调用链和状态。详见[斜杠命令](../reference/slash-commands.md#信息与状态)。

### 新功能

- **渗透测试模式**：输入 `/pentest` 或 `/hack` 切换到专业渗透测试工作台，界面切换为 Matrix 绿字黑底黑客主题。
- **渗透测试工具**：五个仅在渗透测试模式下可用的新工具——`PortScanner`（nmap 端口扫描）、`DirBrute`（40+ 路径字典目录爆破）、`PasswordBrute`（常见密码字典凭据测试）、`ThreatModel`（STRIDE 威胁建模 + Mermaid 图表）、`SubdomainEnum`（DNS 解析 + 50+ 子域名枚举）。
- **核心安全工具**：四个始终可用的安全工具——`SecurityScan`（116 漏洞规则，覆盖 SQLi、XSS、命令注入、路径穿越、SSRF、反序列化、弱加密、认证缺陷）、`SecretScan`（Shannon 熵评分的硬编码凭据检测）、`TaintTrace`（跨文件用户输入到危险 sink 的污点追踪）、`DepAudit`（依赖审计，含 postinstall 脚本检查、版本锁定检测和 OSV CVE 查询）。
- 渗透测试报告生成：`/report` 导出 HTML/PDF 格式，包含执行摘要、风险矩阵、漏洞详情（CWE/OWASP/CVSS）、复现步骤和修复建议。
- 斜杠命令系统：30+ 内置命令——`/help`、`/login`、`/logout`、`/model`、`/provider`、`/settings`、`/permission`、`/theme`、`/editor`、`/exit`、`/version`、`/status`、`/usage`、`/title`、`/compact`、`/new`、`/sessions`、`/session`、`/tasks`、`/fork`、`/undo`、`/init`、`/export-md`、`/export-debug-zip`、`/copy`、`/reload`、`/reload-tui`、`/goal`、`/swarm`、`/plan`、`/yolo`、`/auto`、`/btw`、`/mcp`、`/plugins`、`/feedback`、`/add-dir`、`/experiments`、`/mcp-config`、`/custom-theme`、`/update-config`、`/check-nighthawk-docs`、`/import-from-cc-codex`、`/sub-skill`。
- MCP stdio 支持 kaos executor：可为 MCP stdio server 配置 `executor: 'kaos'`，通过 Kaos 执行器启动子进程，不再局限于本地执行。
- ACP 支持 `type: 'acp'` 的 MCP transport：来自 ACP 的 MCP server 若为 `acp` transport 现可正常处理，不再被丢弃。
- Todo 新增优先级字段：每个 todo 项可设置 `priority`（high/medium/low），在 TUI 中按优先级排序展示。
- ACP 支持 Other 自由文本：ACP 协议中 `Other` 类型的 content block 现可自由编辑文本内容，不再被忽略。
- TUI Agent 按描述自动分组/拆分：多个 Agent 工具调用在 TUI 中根据描述自动合并为组，支持按需拆分查看。
- v2 渗透测试模式完整实现：`setPentestMode` 在 v2 引擎中完全实现，SDK 客户端可正常切换渗透测试模式。
- v2 非 main agent Goal 支持：v2 引擎中非 main agent 现也可设置和执行 Goal 目标，消除 v1/v2 差异。
- v2 Kaos 注入适配器：`createSessionWithKaos` / `resumeSessionWithKaos` 在 v2 引擎中正确注入 Kaos 执行环境，不再退化到本地执行。
- 旧版 CLI 插件迁移支持：`nighthawk migrate` 现支持迁移旧版 CLI 插件本体，技能与插件均可完整迁移。

### 优化

- WaitFor 工具：Agent 可以在当前轮次内等待后台任务完成，无需结束轮次后再次被唤起。
- Edit 和 Write 现在要求先读取已存在的文件再进行修改。
- 折叠过长的 `!` Shell 命令输出，避免刷屏；按 Ctrl+O 可与工具输出一起展开或折叠。
- API 请求失败自动重试期间按 Ctrl+C 不再无反应。

### 修复

- 修复 config.toml 在存在语法错误或在应用外被编辑时条目丢失的问题。
- 修复粘贴的图片和视频无法发送给模型的问题。
- 修复 Gemini 工具调用会话后续请求失败的问题。
- 修复了一些已知问题，并做了若干细节优化。

## 0.39.0（2026-08-26）

### 新功能

- TUI 全屏模式：设置 `NIGHTHAWK_TUI_FULL_SCREEN=1` 启用可滚动转录视口、鼠标选择文本、可点击链接和 Ctrl-Shift-F 搜索。
- TUI LaTeX 渲染：消息中的 `$…$` 和 `$$…$$` 数学公式显示为 Unicode 公式。
- 子 Agent 模型池（实验性）：在 `[secondary_model]` 中配置带描述的候选模型池，主 Agent 每次派生时按任务挑选。
- `/tasks` 面板实时展示后台子 Agent 的工作进度。
- `/feedback`（别名 `/bug`）支持附加诊断日志和代码库上下文。

### 优化

- 应用 Anthropic 官方 effort 配置，未知模型回退到 128k 输出上限。
- OAuth 连接失败时现在会显示底层网络原因（DNS、连接被拒、TLS、超时），不再是笼统的 `fetch failed`。
- `/model` 与 `/effort` 选择器现在会提示切换会使已有提示词缓存失效。

### 修复

- 修复未信任工作区可在信任确认前植入同名 `fd`/`stty` 可执行文件的风险；信任提示现在展示项目 MCP 的启动目标，并默认拒绝信任。
- 修复了启动过程中命令名称解析可能被利用进行二进制植入的风险。
- 修复了在工作区信任门控之前，启动路径未使用 `resolveCommandPath` 解析外部命令的问题。
- 修复在严格的 OpenAI 兼容供应商（如 DeepSeek）下，模型思考阶段打断轮次后，后续每轮请求都报 400 错误的问题。
- 修复 `nighthawk -p` 未等待后台任务与子 Agent 完成就退出的问题。
- 修复 MCP 工具结果中 `structuredContent` 与 `_meta` 元数据被静默丢弃的问题。
- 修复移除 MCP 服务会破坏进行中会话的问题：工具保留但调用返回移除提示。

## 0.38.0（2026-08-24）

### 新功能

- 官方 NightHawk Datasource 插件新增 13 个数据源：中国政府数据（NDA/NBS）与标准（GB/HB/DB/TT）、八个国际组织数据集（WHO、FAO、UNSD、ECB、Eurostat、UNICEF、OECD、FRED）、新华财经和财新。在 `/plugins` 的 Official 标签页中更新插件。
- web：聊天头部的更多菜单新增置顶操作。
- 新增四个 hook 事件：`TurnStarted`、`UserPromptQueued`、`TaskStarted` 和 `SessionHeartbeat`。在 `config.toml` 的 `[[hooks]]` 下配置。
- 会话空闲过久后恢复或发送消息时，现将会弹出缓存过期提醒。将 `[tui].cache_expiry_hint` 设为 `false` 可关闭。

### 优化

- 插件市场新增 Official 标签页，包含 NightHawk Computer Use 与 NightHawk WebBridge 官方内置插件，安装时自动配置托管运行时。
- 底部状态栏现可通过 `tui.toml` 中 `[status_line]` 自定义显示槽位和顺序。
- `nighthawk -p` 和 `nighthawk web` 默认切换到 agent-core-v2 引擎；设置 `NIGHTHAWK_LEGACY_FLAG=1` 可回退旧引擎。

### 修复

- 修复内容过滤响应后，会话卡住并报 "message must not be empty" 错误的问题。
- 修复会话 fork 丢失内容的问题：fork 出的会话现在保留媒体附件、plan 文件、后台任务输出和定时任务。
- 修复 web：Windows 下同一文件夹以不同路径写法打开时出现重复工作区分组的问题，现在统一归入单个分组。
- 修复 web：聊天消息中 @提及的文件现在渲染为图标胶囊。
- 修复 web：浏览器标签页标题现在显示当前工作区目录名。

## 0.37.0（2026-08-22）

### 新功能

- 支持在单条提示词中激活多个 skill：在空白后输入 `/` 即可插入 skill 标记。
- Windows 原生（单文件）CLI 现支持自动更新。
- web：侧边栏新增 Open / Done / Workspaces 标签页，会话可标记为 Done。
- web：新增会话管理页面。
- Agent Skills：内置 Skill 直接以 `/<name>` 形式出现在斜杠命令面板中——`/mcp-config`、`/custom-theme`、`/update-config`、`/check-nighthawk-docs`、`/import-from-cc-codex`、`/sub-skill`。
- 外部 Skill 自动注册为 `/skill:<name>` 斜杠命令，名称未被占用时支持 `<name>` 简写形式。

### 优化

- Agent 忙碌时输入的 skill 斜杠命令现在会排队执行，不再直接拒绝。
- `/goal` 目标超过 4000 字符限制时现在会给出警告，且被拒绝时保留已输入的内容。
- web：Subagent 面板更名为 "Background Agent"。
- 优化 `/permission`、`/auto`、`/yolo` 显示的权限模式描述：YOLO 自动批准工具操作但 Agent 仍可能提问；Auto 完全自主不会提问。

### 修复

- 修复原工作目录已不存在的会话无法恢复的问题——服务器会在启动时重建会话索引。
- 修复会话已存在于磁盘却在会话列表中缺失、或直接访问时返回 404 的问题。
- 修复 web：Markdown 渲染器升级后聊天代码块以 UI 字体、错误字号渲染的问题。
- 修复 web：Cmd+K 会话搜索显示重复结果的问题。
- 修复 web：切换回某会话时恢复其滚动位置。

## 0.36.0（2026-08-20）

### 新功能

- web：AI 自动生成会话标题（实验性）。设置 `NIGHTHAWK_EXPERIMENTAL_AUTO_SESSION_TITLE=1`（或实验总开关 `NIGHTHAWK_EXPERIMENTAL_FLAG=1`）开启。
- TUI 支持渲染 LaTeX 数学公式（`$…$` 与 `$$…$$`），消息中的公式会显示为 Unicode 公式。
- 可自定义的 Agent 身份标识：在 `config.toml` 中设置 `[identity]` 的 `name` 和 `slug`。
- 新增 `/copy` 斜杠命令：将最后一条 AI 回复复制到剪贴板。

### 优化

- web：优化输入框的 Plan、Goal、Swarm 开关，现收进了输入框旁的 + 号菜单。
- `/usage` 和 `/status` 命令现显示 Extra Usage（加油包）余额。
- 在会话创建前，于输入框中显示可用的 skills。

### 修复

- 修复 Web 服务器 bearer token 校验可被百分号编码的 API 路径绕过、导致所有 API 路由可被未认证访问的问题。
- 修复会话文件系统 API 可跟随指向工作区外的符号链接、导致宿主机文件被越权访问的问题。
- 修复 web：首次加载时颜色主题未正确应用的问题。
- 修复 web：断线重连后会话卡在发送状态的问题。
- 修复 web：首个会话粘贴的图片未显示在输入框中的问题。

## 0.35.0（2026-08-18）

### 新功能

- 内置插件市场新增 Modern Web Guidance 插件，通过 `/plugins` 选择安装。
- `/tasks` 面板实时展示后台子 Agent 的工作进度。
- 支持 `NIGHTHAWK_MODEL_*` 环境变量定义临时模型，无需修改 `config.toml`。

### 优化

- Agent Skills 系统支持多层发现：项目 > 用户 > plugin > 内置。
- Agent 忙碌时输入的 Skill 命令现在会排队执行，不再直接拒绝。
- web：打开模型选择器时刷新所有供应商的模型目录，新上线的模型现在总能显示。

### 修复

- 修复 coder 子 Agent 默认可继续派生子 Agent 的问题。
- 修复压缩后 token 数显示偏低的问题，现在与会话中看到的数字一致。
- 修复 Windows 上的两处二进制植入风险。
- 修复 `nighthawk -p` 在轮次失败时仍以退出码 0 退出的问题。
- 修复工作区目录通过符号链接给出时会话创建失败的问题。

## 0.34.0（2026-08-16）

### 新功能

- web：侧边栏会话列表新增平铺视图。
- NightHawk Computer Use 插件新增 Windows x64 支持，通过 `/plugins` 安装。
- 新增 `/mcp-config` 斜杠命令，用于交互式配置 MCP server。
- 新增 `/mcp` 斜杠命令，查看 MCP server 连接状态。

### 优化

- web：子 Agent 任务显示所用模型与思考等级。
- web：模型请求失败时会话内保留失败卡片，可一键恢复。
- web：自动重试期间工作状态显示重试进度（第 N/M 次）。
- MCP server 连接超时和工具调用超时现可通过 `config.toml` 的 `[mcp]` 全局配置。

### 修复

- 修复无法读取 UTF-16 LE/BE 文本文件（有无 BOM 均可）的问题。
- 修复 web：附件随技能命令发送时被丢弃的问题。
- 修复 web：模型较多时模型选择器溢出屏幕的问题。
- 修复 web：Windows 上路径含空格时打开 Documents 文件夹而非目标文件的问题。
- 修复 web：重命名会话时输入法组合中 Enter、Esc 误触发的问题。
- 修复 web：重命名时拖动选择文本会移动整个列表项的问题。

## 0.33.0（2026-08-14）

### 新功能

- `/plugins` 市场：NightHawk Computer Use 与 NightHawk WebBridge 官方内置插件，安装时自动配置托管运行时，中断后可重试。
- web：支持在设置中添加和管理自定义供应商。
- web：侧边栏支持将会话置顶。
- web：会话标题支持设置 emoji。
- web：显示登录账号信息与套餐用量。

### 优化

- 启动时询问是否信任当前文件夹。
- `/fork` 不再切换到分叉会话，当前会话与后台任务保持运行，分叉结果可在 `/sessions` 中查看。
- 插件市场的合作伙伴标签页更名为 Curated，并说明其内容为 NightHawk 合作伙伴提供的第三方插件。
- 自动检测 Windows 上原生 MSYS2 工具链（ucrt64/clang64/clangarm64）的 Git Bash。

### 修复

- 修复 macOS 上技能目录文件过多时所有工具调用失败（spawn EBADF）的问题。
- 修复首条请求未等待 MCP 初始化完成的问题，界面仍可立即打开。
- 修复 MCP 工具结果中 `structuredContent` 与 `_meta` 元数据被静默丢弃的问题，现已正确传递给模型。
- 修复 `/plugins` 中内置能力的可用性与安装状态显示。
- 修复 web：各设置页面的权限模式按从严到宽排序，并修复状态面板与移动端设置中 yolo/auto 风险颜色颠倒的问题。

## 0.32.0（2026-08-12）

### 新功能

- TUI 支持 Markdown 定义的自定义 Agent。
- 新增 `/secondary_model` 斜杠命令，用于配置子 Agent 使用的辅助模型（实验性功能，需先在 `/experiments` 中开启）。
- 插件可贡献自定义 Agent，自动发现并可用于子 Agent 委派。
- 插件可贡献系统提示词，通过 `nighthawk.plugin.json` 中的 `systemPrompt` 或 `systemPromptPath` 声明。

### 优化

- `nighthawk -p` 后台任务和子 Agent 默认不再超时（交互模式不变）；如需恢复限制，可设置 `[background] bash_task_timeout_s` 或 `[subagent] timeout_ms`。
- 每步 LLM 重试上限从 3 次提高到 10 次，供应商临时失败（429 / 过载）会在轮次失败前自动重试。
- 工作区现在自动保持同步：新会话自动注册，缺失工作区启动时补全，已移除的不再重现。
- `nighthawk web` 现在会记录失败请求和关键操作，便于诊断服务问题。

### 修复

- 修复 `nighthawk -p` 的后台子 Agent 无法返回结果给主 Agent 的问题。
- 修复会话 fork 丢失内容的问题：fork 出的会话现在保留媒体附件、plan 文件、后台任务输出和定时任务。
- 修复 web：子 Agent 仍在运行时刷新页面，AgentSwarm 成员列表消失的问题。
- 修复 web：iOS 移动端布局问题，包括 composer、安全区和 toast。
- 修复 web：把复制的文件夹粘贴进输入框会导致上传报连接错误的问题，现在文件夹会被直接跳过。

## 0.31.0（2026-08-10）

### 新功能

- NightHawk CLI 首个公开发布版本。
- 交互式 TUI，支持深色/浅色/自动主题和自定义主题。
- `/login` 和 `/provider` 通过 API 密钥配置 AI 供应商。
- 完整的 Turn/Step Agent 循环，支持 Plan 模式、YOLO 模式和 Auto 模式。
- 内置工具：`Read`、`Write`、`Edit`、`Grep`、`Glob`、`Bash`、`FetchURL`、`CronCreate`、`CronDelete`、`CronList`、`TaskList`、`TaskOutput`、`TaskStop`、`TodoList`、`WaitFor`、`Agent`、`AgentSwarm`、`AskUserQuestion`、`EnterPlanMode`、`ExitPlanMode`、`ReadMediaFile`、`Skill`。
- 斜杠命令系统，支持会话管理、模式切换和配置命令。
- MCP（Model Context Protocol）客户端，支持 stdio、HTTP 和 SSE 传输。
- 插件系统，集成市场（`/plugins`）。
- Agent Skills 系统，支持多层发现。
- 会话持久化、恢复、分叉和导出。
- 目标模式（`/goal`）用于自主长期目标。
- Web UI（`nighthawk web`），提供 REST API 和 WebSocket 事件流。
- 通过 `config.toml` 和 `tui.toml` 配置，支持环境变量覆盖。
- 支持多种 LLM 供应商：Anthropic Claude、OpenAI、Google Gemini、Vertex AI 和 OpenAI 兼容第三方服务。
- Thinking 模式支持，可配置思考强度档位。
- 后台任务管理，支持进度追踪。
- 生命周期 Hook 系统。
- 代理支持（HTTP、HTTPS、SOCKS）覆盖所有出站流量。
- 自动更新机制。
- 匿名遥测（通过 `NIGHTHAWK_DISABLE_TELEMETRY=1` 关闭）。