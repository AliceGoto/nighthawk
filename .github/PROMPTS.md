# .github 提示词

> 约束见 `CONSTRAINTS.md`。

## 开发提示词

```text
请修改 .github/ 下的 CI 或模板。
保持最小权限。
修改后检查 workflow 语法与路径。
```

## 验证

```sh
find .github/workflows -name '*.yml' -o -name '*.yaml'
```

## 证据与代码位置

- `.github/CONSTRAINTS.md`
- `.github/`
