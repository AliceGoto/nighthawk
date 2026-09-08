# plugins 提示词

> 约束见 `CONSTRAINTS.md`。

## 开发提示词

```text
请修改 plugins/ 下的插件或市场配置。
保持 manifest 格式与现有插件一致。
```

## 验证

```sh
python3 -m json.tool plugins/marketplace.json
```

## 证据与代码位置

- `plugins/CONSTRAINTS.md`
- `plugins/`
