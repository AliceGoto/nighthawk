# kap-server/src 约束

> 本文件是目录级约束，继承上层 CONSTRAINTS.md。

## 硬约束

- 只修改与任务直接相关的源码文件。
- 不破坏公共导出与协议兼容性。
- 新功能必须包含测试。
- 遵循项目根 CONSTRAINTS.md 和父目录 CONSTRAINTS.md。

## 验证命令

```sh
pnpm -C ../ typecheck
pnpm -C ../ test
```
