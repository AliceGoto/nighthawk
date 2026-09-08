# NightHawk 提示词库

本文件是仓库级提示词入口，供 AI 工具与人类开发者复制使用。更细的提示词见 `project-encyclopedia/13-vibe-coding/` 和 `project-encyclopedia/14-prompts-constraints/`。

## 全局工作提示词

```text
请严格遵循：
1. 根 CONSTRAINTS.md
2. 当前目录 CONSTRAINTS.md
3. 根 AGENTS.md 与最近的 AGENTS.md
4. 相关 README

先阅读相关代码和文档，再开始修改。
完成后运行测试、typecheck、lint，并自检是否违反约束。
```

## 新功能开发

```text
请实现 [功能]。

需求：
- [用户故事/行为]
- [输入输出]
- [技术约束]

流程：
1. 阅读相关代码。
2. 给出实现计划。
3. 实现并写测试。
4. 运行验证。

验收标准：
- [可观察结果]
- 测试通过
- 不破坏现有功能
```

## 修复 Bug

```text
请定位并修复 [Bug]。

现象：
- [复现步骤]
- [期望]
- [实际]

要求：
1. 找根因。
2. 解释修复方案。
3. 写回归测试。
4. 运行验证。
```

## 代码审查

```text
请审查 [分支/文件]。

重点：
- 正确性
- 安全性
- 性能
- 风格一致性
- 测试覆盖

输出：
- 问题按严重度排序
- 每条给出 file:line 和修复建议
```

## 安全审计

```text
请对 [路径] 执行安全审计：
1. SecurityScan
2. SecretScan
3. TaintTrace
4. DepAudit

输出风险等级、证据、修复建议。
```

## Vibe Coding 日常迭代

```text
请继续当前任务：
1. 读取 TODO。
2. 选择下一步。
3. 实现。
4. 运行验证。
5. 更新 TODO。
6. 简短汇报。
```

## 角色化提示词

- 架构师：先分析架构，再给方案。
- 技术负责人：拆任务、定验收、分配子 Agent。
- 代码审查者：严格审查并给 P0/P1/P2。
- 安全工程师：执行安全工具链。
- 测试工程师：补测试并运行。
- 文档工程师：写 README/API/FAQ。

详细模板见 `project-encyclopedia/13-vibe-coding/role-prompts.md`。

## 约束提示词

```text
如果某个操作违反 CONSTRAINTS.md 或 AGENTS.md，必须停下并报告冲突，不要自行绕过。
```

## 证据与代码位置

- `CONSTRAINTS.md`
- `AGENTS.md`
- `project-encyclopedia/13-vibe-coding/`
- `project-encyclopedia/14-prompts-constraints/`
