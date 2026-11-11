# 开始使用

## NightHawk CLI 是什么

NightHawk CLI 是一个运行在终端中的 AI Agent，帮助你完成软件开发任务和日常的终端操作——阅读和修改代码、执行 Shell 命令、搜索文件、抓取网页，并在执行过程中根据反馈自主规划和调整下一步行动。

它适用于以下场景：

- **编写和修改代码**：实现新功能、修复 bug、完成重构
- **理解项目**：探索陌生的代码库，解答架构和实现层面的问题
- **自动化任务**：批量处理文件、运行构建与测试、串联多个脚本

整套 CLI 以 TypeScript 编写，发布产物是单文件原生可执行文件，装好之后不需要额外安装 Node.js。

## 安装

目前提供三种方式：Homebrew、直接下载发布产物、从源码构建。当前发布的产物只有 macOS Apple silicon 一个平台。

::: tip 安装之前
NightHawk CLI 为全交互式 TUI 应用，推荐在支持真彩色与连字的现代终端中运行以获得最佳体验，例如 [Kitty](https://sw.kovidgoyal.net/kitty/) 或 [Ghostty](https://ghostty.org/)。
:::

### Homebrew（macOS Apple silicon，推荐）

```sh
brew install AliceGoto/nighthawk/nighthawk
```

### 下载发布产物

到 [Releases](https://github.com/AliceGoto/nighthawk/releases) 下载 `nighthawk-darwin-arm64.zip`，解压后把 `nighthawk` 放到 `PATH` 里的目录：

```sh
unzip nighthawk-darwin-arm64.zip -d ~/.local/bin
chmod +x ~/.local/bin/nighthawk
```

压缩包旁边有 `.sha256` 文件，下载后可以先校验：

```sh
shasum -a 256 -c nighthawk-darwin-arm64.zip.sha256
```

### 从源码构建

需要 Node.js 24.15.0 或更高版本，以及 pnpm 10：

```sh
git clone https://github.com/AliceGoto/nighthawk.git
cd nighthawk
pnpm install
pnpm --filter @nighthawk/nighthawk run build
cd apps/nighthawk && pnpm link --global
```

`pnpm link --global` 会把 `nighthawk` 命令挂到全局。不想动全局环境的话，构建完成后直接跑 `node apps/nighthawk/dist/main.mjs` 也可以。

> Windows 用户首次启动前还需要安装 [Git for Windows](https://gitforwindows.org/)，NightHawk CLI 会使用其中的 Git Bash 作为 Shell 环境。如果 Git Bash 安装在非标准路径，请把 `NIGHTHAWK_SHELL_PATH` 设为 `bash.exe` 的绝对路径。目前 Windows 没有现成产物，需要按上面的源码方式构建。

## 第一次启动

进入项目目录后直接运行 `nighthawk` 启动交互界面：

```sh
cd your-project
nighthawk
```

只想执行一条指令而不进入交互界面时，使用 `-p`：

```sh
nighthawk -p "帮我看一下这个项目的目录结构"
```

继续上一次会话加 `-c`：

```sh
nighthawk -c
```

首次启动前需要配置一个模型供应商。直接编辑 `~/.nighthawk/config.toml`，加一段 provider 和对应模型即可，例如 DeepSeek：

```toml
[providers.deepseek]
type = "openai"
base_url = "https://api.deepseek.com"
api_key_env = "DEEPSEEK_API_KEY"

[models.deepseek-chat]
provider = "deepseek"
model = "deepseek-chat"

default_model = "deepseek-chat"
```

`api_key_env` 指定从哪个环境变量读取密钥；不想用环境变量的也可以直接写 `api_key`。密钥只存在于本机配置里，NightHawk 没有账号体系，不会把凭证发到任何托管服务。

也可以在交互界面里输入 `/provider` 走一遍交互式配置，它会从模型目录里选供应商、填密钥、选默认模型。完整说明见[平台与模型](../configuration/providers.md)，配置项见[配置文件](../configuration/config-files.md)、[环境变量](../configuration/env-vars.md)和[配置覆盖](../configuration/overrides.md)。

## 第一个对话

登录完成后，用自然语言描述任务即可。先让它熟悉当前项目：

```
帮我看一下这个项目的目录结构，简单介绍一下每个目录是做什么的
```

NightHawk CLI 会自动调用文件读取、搜索等工具浏览相关内容后给出回答。只读操作默认自动执行无需确认；对于会修改文件或执行 Shell 命令的操作，默认会在执行前征求确认。

也可以直接描述更具体的任务：

```
在 src/utils 里新增一个函数，用来把任意字符串转成 kebab-case，并补一个单元测试
```

NightHawk CLI 会规划步骤、修改代码、运行测试，并在每一步告诉你它做了什么。

::: tip 不知道能做什么？输入 `/help`
随时在输入框输入 `/help`，可以打开内置的命令和快捷键面板，按 `↑`/`↓` 翻看，`Esc` 关闭。退出时输入 `/exit`，或按 `Ctrl-C` 两次，或在输入框为空时按 `Ctrl-D`。
:::

## 常用命令与快捷键速查

第一次使用时，记住下面这些就够了：

**会话相关命令**

| 命令 | 说明 |
| --- | --- |
| `/new` | 开启新会话，清空当前上下文 |
| `/sessions` | 浏览历史会话，选择恢复 |
| `/model` | 切换当前使用的模型 |
| `/compact` | 手动压缩上下文，释放 token |
| `/fork` | 派生当前会话为保留完整历史的独立副本（仍停留在当前会话） |

**最常用快捷键**

| 快捷键 | 说明 |
| --- | --- |
| `Esc` | 中断流式输出 / 关闭弹窗 |
| `Ctrl-C` | 中断输出；空闲时连按两次退出 |
| `Shift-Tab` | 切换 Plan 模式 |
| `Ctrl-S` | 输出中途插入消息，无需等待结束 |
| `Ctrl-O` | 折叠 / 展开工具输出和压缩摘要 |

想看完整列表，输入 `/help` 或访问[斜杠命令参考](../reference/slash-commands.md)和[键盘快捷键](../reference/keyboard.md)。

## 数据存放在哪里

NightHawk CLI 的本地数据默认保存在 `~/.nighthawk/` 下，包含配置文件、会话记录、日志和更新缓存。如需迁移到别处，通过 `NIGHTHAWK_HOME` 环境变量指定新路径。完整说明见[数据路径](../configuration/data-locations.md)和[环境变量](../configuration/env-vars.md)。

## 升级与卸载

安装完成后，验证可执行文件是否就绪：

```sh
nighthawk --version
```

**升级**：运行 `nighthawk upgrade`，CLI 会检查最新版本并展示更新选项。Homebrew 安装的用户也可以直接升级：

```sh
brew upgrade AliceGoto/nighthawk/nighthawk
```

从源码构建的用户更新仓库后重新构建：

```sh
git pull && pnpm install && pnpm --filter @nighthawk/nighthawk run build
```

**卸载**：Homebrew 安装的用户跑 `brew uninstall nighthawk`，手动安装的删掉 `nighthawk` 可执行文件即可。

## 下一步

- [交互与输入](./interaction.md) — 输入框操作、审批流程、Plan 模式和 "Ask When Needed" 模式详解
- [会话与上下文](./sessions.md) — 恢复会话、上下文压缩、导出会话
- [常见使用案例](./use-cases.md) — 典型任务的 prompt 示例
