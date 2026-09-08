# NightHawk

**安全为先的终端 AI Agent —— 渗透测试、代码审计与高强度编程，同一个闭环。**

NightHawk 的核心命题：进攻性安全与严肃工程属于同一个 Agent。它将现代化编程 Agent 内核（Turn/Step 循环、子 Agent、MCP、Skills、持久记忆）与原生安全引擎结合 —— 116 条映射到 OWASP Top 10 与 CWE 的漏洞规则、基于 Shannon 熵的密钥检测、跨文件污点追踪、依赖审计（离线 / OSV / 宿主机包管理器）—— 全部作为一等工具暴露给 Agent，可在会话中随时调用。

[English](README.md)

---

## 为什么选择 NightHawk

大多数 AI 编程 Agent 帮你更快地写代码。NightHawk 帮你**攻破它、证明它、修复它**：

- **审计是一等工作流。** 一句"审计这个仓库的注入风险"，Agent 即运行 `SecurityScan` 按严重度分诊，用 `TaintTrace` 确认可利用性，并给出修复建议 —— 一个回合完成。
- **面向进攻性安全。** 密钥狩猎、依赖风险、危险汇点追踪、配置缺陷，由同一个能读、能改、能跑代码的闭环呈现 —— 无需在扫描器和 IDE 之间切换上下文。
- **编码能力不落下。** Turn/Step 内核、并行工具调用、子 Agent 扇出、会话检查点，工程标准对标最强闭源编程 Agent —— 并有完整的验证体系背书（见[工程证明](#工程证明)）。
- **终端原生。** TUI 毫秒级启动，可 over SSH 运行，无需 IDE。TUI 层基于 pi 风格的组件化框架构建。
- **供应商无关。** OpenAI、Anthropic、Google、DeepSeek，或任何 OpenAI/Anthropic 兼容端点 —— 供应商层是协议抽象，不是厂商锁定。

## 安全工具箱

| 工具 | 功能 |
| --- | --- |
| `SecurityScan` | 规则引擎，116 模式覆盖 SQL 注入、XSS、命令注入、路径穿越、SSRF、反序列化、弱加密、认证缺陷、XXE 及分语言风险（Node/Python/Java/Go/PHP）。每个发现携带 CWE/OWASP 编号、严重度和修复建议 —— 中英双语。结果写入磁盘缓存，重复扫描未变更文件时更快。 |
| `SecretScan` | 检测硬编码凭据 —— AWS/GCP/Azure 密钥、token、私钥 —— 已知模式与 Shannon 熵评分相结合。 |
| `TaintTrace` | 污点追踪：识别用户可控源（HTTP 参数、环境变量、stdin），追踪赋值链到危险汇点（exec、eval、innerHTML、SQL）。默认沿模块导入跨文件追踪数据流（`scope: file` 可限定单文件）。 |
| `DepAudit` | 通过离线检查标记高风险依赖模式（postinstall 脚本、未锁定版本、已知风险配置），查询 OSV API，并可调用宿主机包管理器审计工具（`useExternal: true`）合并真实 CVE。 |
| `PortScanner` | 端口扫描 —— 通过 nmap 扫描目标开放端口与服务。仅在渗透测试模式下可用。 |
| `DirBrute` | 目录爆破 —— 内置 40+ 常见路径字典枚举 Web 目录。仅在渗透测试模式下可用。 |
| `PasswordBrute` | 密码爆破 —— 常见密码字典测试登录凭证。需显式授权确认。仅在渗透测试模式下可用。 |
| `ThreatModel` | 威胁建模 —— 基于 STRIDE 模型，含信任边界分析和 Mermaid 图。仅在渗透测试模式下可用。 |
| `SubdomainEnum` | 子域名枚举 —— DNS 解析 + 50+ 常见子域名字典。仅在渗透测试模式下可用。 |

工具间形成合力：规则命中为污点追踪提供种子，污点流确认可利用性，确认后的发现驱动修复建议。

## 渗透测试模式

渗透测试模式将 NightHawk 切换为专业渗透测试工作台。使用 `/pentest` 进入：

- **黑客主题** — Matrix 绿字黑底界面、进场动画、渗透测试风格加载提示
- **强制阶段编排** — Agent 按 9 个阶段依次执行：合规红线 → 范围确认 → 信息收集 → 攻击面分析 → 漏洞验证 → 漏洞利用（PoC） → 后渗透评估 → 修复方案 → 报告生成
- **自动阶段推进** — 编排器发送阶段专属 prompt，等待完成后自动进入下一阶段
- **完整工具集** — PortScanner、DirBrute、PasswordBrute、ThreatModel、SubdomainEnum 及四个核心安全工具
- **专业报告** — 生成 HTML/PDF 报告，含风险评分和证据

```
/pentest              → 切换模式（开启/关闭）
/pentest <target>     → 启动渗透测试
```

详见 [docs/zh/guides/pentest-mode.md](docs/zh/guides/pentest-mode.md)。

## 工程证明

NightHawk 的 Agent 内核采用与顶级编程 Agent 相同的方式验证 —— 契约、一致性套件与端到端运行，而非演示：

- **契约钉死的 SDK** —— 客户端 SDK 的每个线上方法都有 zod schema 镜像，并与引擎类型做编译期一致性断言；schema 漂移会让构建失败，而不是让用户踩坑。
- **传输一致性套件** —— 同一套共享测试原封不动地跑在每种传输（进程内 memory + IPC）上，保证两者返回字节级一致的数据。
- **安全引擎冒烟测试** —— `scripts/smoke-security.ts` 用已知漏洞样本驱动全部四个安全工具；引擎变更后运行。
- **在线 e2e 套件** —— REST + WebSocket 会话面端到端测试，带结构化、按用例隔离的可观测性。
- **仓库守卫** —— lint 期检查强制执行导入边界、工作区同步与打包完整性。

自行验证一份检出代码：

```sh
pnpm lint                                  # oxlint + eslint + 仓库守卫
pnpm -C packages/agent-core test           # 引擎 + 安全工具测试
node scripts/smoke-security.ts             # 安全引擎端到端
```

## 架构

```
┌─────────────────────────────────────────────────────────┐
│  apps/nighthawk — CLI / TUI                             │
│  (终端界面、斜杠命令、审批流、主题)                        │
└───────────────────────────┬─────────────────────────────┘
                            │ SDK
┌───────────────────────────▼─────────────────────────────┐
│  agent-core-v2 — 当前 Agent 引擎（DI×Scope）            │
│  agent-core — v1 旧版 Agent 引擎                        │
│  Turn/Step · 工具 · Skills · MCP 客户端                 │
│  会话检查点 · 权限 · 子 Agent                            │
│  └─ 安全工具: SecurityScan / SecretScan /               │
│     TaintTrace / DepAudit / PortScanner / DirBrute /   │
│     PasswordBrute / ThreatModel / SubdomainEnum        │
├─────────────────────────────────────────────────────────┤
│  kosong — LLM 供应商抽象（多供应商）                     │
│  kaos — 执行环境与文件/进程抽象                          │
└─────────────────────────────────────────────────────────┘
```

设计上取当前一代 Agent harness 之所长 —— 类型化工具调用 Turn/Step 循环（没有显式 observe/reflect 阶段）、作为隔离状态机（而非嵌套提示词）的子 Agent、把模型后端视为可互换协议的供应商抽象。

### Monorepo 布局

| 路径 | 用途 |
| --- | --- |
| `apps/nighthawk` | CLI/TUI 应用（`nighthawk` 二进制）。 |
| `packages/agent-core` | Agent 引擎：循环、工具、profile、Skills、MCP、会话、记录、安全工具。 |
| `packages/security-core` | 独立安全引擎源码（规则、扫描器、密钥检测、污点分析）。**已弃用** —— 生产版安全引擎位于 `packages/agent-core/src/tools/builtin/security/`。 |
| `packages/kosong` | LLM/供应商抽象 —— OpenAI、Anthropic、Google 及兼容协议。 |
| `packages/kaos` | 执行环境：本地或远程主机上的文件/进程抽象。 |
| `packages/node-sdk` | 公开 TypeScript SDK 与 harness。 |
| `packages/pi-tui` | 驱动 TUI 的 pi 风格终端 UI 组件框架。 |
| `apps/vscode`、`apps/nighthawk-inspect`、`apps/vis` | 编辑器扩展、引擎检查器、会话可视化。 |

## 快速启动

环境要求：Node.js ≥ 24.15，pnpm 10.33。

```sh
git clone https://github.com/AliceGoto/nighthawk && cd nighthawk
pnpm install
pnpm run build:packages
pnpm -C apps/nighthawk run build

# 交互式 TUI
node apps/nighthawk/dist/main.mjs

# 无头安全审计
node apps/nighthawk/dist/main.mjs -p "审计这个仓库的注入和 XSS 风险，按可利用性排序。"

# Web UI（Lobe Chat）
nighthawk web --port 3000
```

在 TUI 中通过 `/login` 配置供应商（API 密钥），或设置 `NIGHTHAWK_API_KEY` / 编辑 `~/.nighthawk/config.toml`。

> 📖 **完整文档**：[https://AliceGoto.github.io/nighthawk/zh/](https://AliceGoto.github.io/nighthawk/zh/) — 使用指南、斜杠命令、工具参考、渗透测试模式说明。

## Agent 能力

- **工具** —— 读写/编辑文件、grep/glob、带审批门的 shell、fetch、网络搜索、git，外加九个安全/渗透测试工具。
- **渗透测试模式** —— `/pentest` 切换为专业渗透测试工作台，含黑客主题、强制阶段编排、自动报告生成。
- **MCP** —— 接入任意 Model Context Protocol 服务器；对话式 `/mcp-config`，无需手写 JSON。
- **Skills** —— Markdown 定义的可复用 playbook，按相关性自动加载。
- **记忆** —— 跨会话复利的持久项目记忆。
- **子 Agent 与后台任务** —— 并行探索，不污染主上下文。
- **Web UI** —— `nighthawk web --port 3000` 启动基于浏览器的 Lobe Chat 聊天界面。
- **会话检查点** —— 长审计可跨重启存活；`-r` 恢复任意会话。
- **权限与沙箱** —— 工作区信任门、路径策略、按工具配置的审批规则。

## 本地开发

```sh
pnpm run build:packages          # 构建所有包
pnpm -C apps/nighthawk run build # 构建 CLI
pnpm lint                        # oxlint + eslint + 仓库守卫
pnpm -C packages/agent-core test # 包测试
```

仓库级工程规范见 [AGENTS.md](AGENTS.md)，各包本地约定见对应包的 `AGENTS.md`。

## 许可证

MIT —— 见 [LICENSE](LICENSE)。
