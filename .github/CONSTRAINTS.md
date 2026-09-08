# .github 约束与提示词

本目录包含 GitHub Actions、Issue/PR 模板、PR title checker 等。

## 开发提示词

```text
请修改 .github/ 下的 CI 或模板。
保持最小权限原则。
修改后检查 workflow 语法与引用路径。
```

## 硬约束

- CI 必须保持构建、分片测试、lint、typecheck、安全 smoke。
- 不添加需要不必要 secret 的步骤。
- PR/Issue 模板不包含真实内部标识。
- PR title 遵循 Conventional Commit。

## 验证命令

```sh
# 本地无法完整验证 GitHub Actions，但可检查 YAML 与路径
find .github/workflows -name '*.yml' -o -name '*.yaml'
```

## 证据与代码位置

- `.github/workflows/`
- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/`
