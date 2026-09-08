# .changeset 约束与提示词

本目录存放 Changesets 版本变更描述。

## 开发提示词

```text
请为本次变更生成 changeset。
遵循 gen-changesets 技能。
```

## 硬约束

- 只写用户可感知的变更。
- 不写文件/类/函数名和 PR 号。
- 不自行决定 major，默认 minor，修复 patch。
- 使用中性占位符，不泄露内部标识。

## 验证命令

```sh
ls .changeset/*.md | grep -v README.md
```

## 证据与代码位置

- `.changeset/config.json`
- `.agents/skills/gen-changesets/SKILL.md`
