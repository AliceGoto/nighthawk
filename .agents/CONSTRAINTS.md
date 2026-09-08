# .agents 约束与提示词

本目录包含仓库内置 AI 开发技能。

## 开发提示词

```text
请修改 .agents/skills/ 下的技能。
保持技能职责单一、可执行、可验证。
```

## 硬约束

- 不把真实内部标识写入技能示例。
- 技能必须引用实际仓库路径或命令。
- 新增技能需要说明触发场景与使用方式。

## 验证命令

```sh
find .agents/skills -name SKILL.md
```

## 证据与代码位置

- `.agents/skills/`
- `AGENTS.md`
