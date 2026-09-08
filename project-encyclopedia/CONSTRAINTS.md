# project-encyclopedia 约束与提示词

本目录是 NightHawk 深度文档集。

## 开发提示词

```text
请更新 project-encyclopedia 中的文档。
保持专业、可验证、易于理解。
每篇文档必须有“证据与代码位置”。
```

## 硬约束

- 不写没有代码证据的结论。
- 文档路径与仓库实际路径保持一致。
- 更新后运行 `python3 .tmp/check_docs.py` 校验。
- 不把内部真实标识写入示例。
- 新增文档需要同步 README 索引。

## 验证命令

```sh
python3 .tmp/check_docs.py
find project-encyclopedia -type f | wc -l
```

## 证据与代码位置

- `project-encyclopedia/README.md`
- `project-encyclopedia/UNIMPLEMENTED-FEATURES.md`
- `.tmp/check_docs.py`
