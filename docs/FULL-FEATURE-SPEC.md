# NightHawk — 完整功能规格

## 项目定位

**安全为先的终端 AI Agent —— 渗透测试、代码审计与高强度编程，同一个闭环。**

NightHawk 将进攻性安全与严肃工程结合在同一个 Agent 中：Turn/Step 循环、子 Agent 扇出、MCP、Skills、持久记忆，与原生安全引擎（116 漏洞规则、Shannon 熵密钥检测、跨文件污点追踪、依赖审计）—— 全部作为一等工具，Agent 可在会话中随时调用。

## 架构

```
apps/nighthawk — CLI / TUI
  │ (终端界面、斜杠命令、审批流、主题、渗透测试模式)
  │ SDK
agent-core-v2 — 当前 Agent 引擎（DI×Scope）
agent-core — v1 旧版 Agent 引擎
  │ Turn/Step · 工具 · Skills · MCP 客户端
  │ 会话检查点 · 权限 · 子 Agent
  │ └─ 安全工具: SecurityScan / SecretScan / TaintTrace / DepAudit
  │ └─ 渗透工具: PortScanner / DirBrute / PasswordBrute / ThreatModel / SubdomainEnum
kosong — LLM 供应商抽象（OpenAI / Anthropic / Google / DeepSeek 等）
kaos — 执行环境与文件/进程抽象（本地 / SSH / 容器）
```

## 斜杠命令系统

### 通用命令（始终可用）
| 命令 | 说明 |
|------|------|
| `/help` | 显示快捷键和所有可用命令 |
| `/login` | 登录模型供应商（API 密钥） |
| `/logout` | 退出已登录的供应商 |
| `/model` | 切换 LLM 模型 |
| `/provider` | 管理供应商 |
| `/settings` | 打开设置面板 |
| `/permission` | 选择权限模式（manual / auto / yolo） |
| `/theme` | 切换 TUI 主题 |
| `/editor` | 配置外部编辑器 |
| `/exit` | 退出 |
| `/version` | 显示版本 |
| `/status` | 显示会话状态 |
| `/usage` | 显示 token 用量 |
| `/title` | 设置会话标题 |
| `/compact` | 压缩上下文 |
| `/new` | 开启新会话 |
| `/sessions` | 浏览历史会话 |
| `/session` | 浏览全部工作区会话 |
| `/tasks` | 浏览后台任务 |
| `/fork` | Fork 新会话 |
| `/undo` | 撤销提示词 |
| `/init` | 生成 AGENTS.md |
| `/export-md` | 导出 Markdown |
| `/export-debug-zip` | 导出调试 ZIP |
| `/copy` | 复制最后一条回复 |
| `/reload` | 重载会话配置 |
| `/reload-tui` | 重载 TUI 配置 |
| `/goal` | 目标模式 |
| `/swarm` | 集群模式 |
| `/tower` | Tower 模式 |
| `/plan` | 计划模式 |
| `/yolo` / `/auto` | 权限模式快捷切换 |
| `/btw` | 旁路对话 |
| `/mcp` | MCP 状态 |
| `/plugins` | 插件管理 |
| `/add-dir` | 添加额外工作目录 |
| `/experiments` | 实验功能 |
| `/feedback` | 提交反馈 |

### 渗透测试命令（仅渗透测试模式可用）
| 命令 | 说明 |
|------|------|
| `/pentest` | 切换渗透测试模式 |
| `/pentest <target>` | 开启模式并启动 9 阶段渗透测试 |
| `/scan [path]` | 安全扫描 |
| `/recon <target>` | 信息收集（端口扫描 + 子域名枚举 + OSINT） |
| `/exploit [finding-id]` | 漏洞利用分析 |
| `/report` | 生成渗透测试报告 |

渗透测试模式下，扩展性命令（`/goal`、`/swarm`、`/tower`、`/plan` 等）被隐藏，只保留渗透测试命令和 Agent 基础功能。

## 安全工具系统

### 核心安全工具（始终可用）
| 工具 | 说明 |
|------|------|
| `SecurityScan` | 116 漏洞规则（SQLi、XSS、命令注入、路径穿越、SSRF、反序列化、弱加密、认证缺陷等） |
| `SecretScan` | 检测硬编码凭据（AWS/GCP/Azure 密钥、token、私钥），Shannon 熵评分 |
| `TaintTrace` | 污点追踪：用户输入到危险 sink 的数据流追踪 |
| `DepAudit` | 依赖审计：postinstall 脚本、未锁定版本、已知风险配置、OSV CVE 查询 |

### 渗透测试工具（仅渗透测试模式可用）
| 工具 | 说明 |
|------|------|
| `PortScanner` | 端口扫描，通过 nmap 检测开放端口与服务版本 |
| `DirBrute` | 目录爆破，内置 40+ 常见路径字典 |
| `PasswordBrute` | 密码爆破，常见密码字典测试登录凭证（需授权） |
| `ThreatModel` | STRIDE 威胁建模 + 信任边界分析 + Mermaid 图表 |
| `SubdomainEnum` | 子域名枚举，DNS 解析 + 50+ 常见子域名字典 |

## 渗透测试模式

### 进入方式
```
/pentest              → 切换模式（开启/关闭）
/pentest <target>     → 开启模式并启动 9 阶段渗透测试
```

### 9 阶段编排流程
| 阶段 | 内容 | 使用工具 |
|------|------|----------|
| 0 - 合规红线 | 确认范围边界和合规规则 | — |
| 1 - 范围确认 | 确认授权和目标范围 | — |
| 2 - 信息收集 | 被动 + 主动信息收集 | PortScanner, SubdomainEnum, SecurityScan, SecretScan, DepAudit, WebSearch |
| 3 - 攻击面分析 | 入口点排序、信任边界图 | ThreatModel, TaintTrace |
| 4 - 漏洞验证 | 代码级确认 + CWE/OWASP 映射 | TaintTrace, Read, DirBrute |
| 5 - 漏洞利用 | 授权 PoC 验证 | DirBrute, PasswordBrute, Bash |
| 6 - 后渗透评估 | 影响分析 + 横向移动路径 | 分析级别（不主动执行） |
| 7 - 修复方案 | 代码级修复建议 | — |
| 8 - 报告生成 | HTML/PDF 报告 + 风险评分 | report-generator |

每个阶段由编排器自动驱动，Agent 完成当前阶段后才进入下一阶段。

### 模式隔离
- 普通模式：渗透测试命令被隐藏，无法误触
- 渗透测试模式：扩展性命令（`/goal`、`/swarm`、`/tower`、`/plan` 等）被隐藏
- 共享命令：`/help`、`/exit`、`/model`、`/login`、`/logout`、`/settings` 等基础功能始终可用

### 黑客主题
- 文字颜色：`#00FF41`（Matrix 绿）
- 背景颜色：黑色
- 进场动画：固件加载 → 内核启动 → 网络初始化 → 模块加载 → 进度条
- 加载提示：渗透测试风格中文提示词

### 安全红线
- 不 exfiltrate 数据
- 不执行破坏性操作
- 不留持久化 payload
- 仅限授权目标
- 远程目标需显式书面授权

## 报告系统

### 渗透测试报告
- 格式：HTML（源格式）+ PDF（通过 headless Chrome 转换）
- 内容：封面页、执行摘要、风险矩阵、漏洞详情（含 CWE/OWASP/CVSS）、复现步骤、修复建议、横向移动分析、附录
- 风险评分：基于严重性加权的风险等级（A/B/C/D）
- 双语：中英双语章节标题

## 主题系统

| 主题 | 说明 |
|------|------|
| `dark` | 默认深色主题 |
| `light` | 浅色主题 |
| `auto` | 根据终端背景自动切换 |
| `hacker` | Matrix 绿字黑底（渗透测试模式自动切换） |
| 自定义 | 通过 `/theme` 加载自定义 JSON 主题 |

## 技术栈

- **语言**: TypeScript (strict mode, ES2024)
- **包管理**: pnpm 10.33 (monorepo workspaces)
- **运行时**: Node.js ≥ 24.15
- **构建**: tsdown (rolldown)
- **测试**: Vitest 4.1
- **Lint**: oxlint
- **CI**: GitHub Actions

## 仓库结构

```
apps/nighthawk           — CLI/TUI 应用
apps/vscode              — VS Code 扩展
apps/nighthawk-inspect   — Web 检查器
packages/agent-core      — Agent 引擎（核心）
packages/agent-core-v2   — Agent 引擎 v2（DI × Scope）
packages/kap-server      — NightHawk 服务器
packages/klient          — 客户端 SDK
packages/node-sdk        — 公开 TypeScript SDK
packages/kosong          — LLM 供应商抽象
packages/kaos            — 执行环境抽象
packages/pi-tui          — 终端 UI 组件框架
packages/transcript      — 转录数据层
packages/security-core   — 安全引擎（已弃用，参考用）
packages/minidb          — 嵌入式 JSON 文档存储
packages/oauth           — OAuth 工具
packages/protocol        — 共享协议 Schema
plugins/official/        — 官方插件（pentest 等）
docs/                    — VitePress 文档站
```