# plugins 约束与提示词

本目录包含插件市场与官方插件包。

## 开发提示词

```text
请修改 plugins/ 下的插件或市场配置。
保持 manifest 格式与现有插件一致。
不引入未授权或不合规插件。
```

## 硬约束

- 插件 manifest 必须声明 `name`、`version`、`description`。
- 插件不能包含真实内部密钥。
- 市场 JSON 必须保持 `tier`、`source`、`version` 字段有效。
- 官方插件改动需同步 `marketplace.json` 或 CDN 构建。

## 验证命令

```sh
python3 -m json.tool plugins/marketplace.json
```

## 证据与代码位置

- `plugins/marketplace.json`
- `plugins/official/`
- `plugins/cdn/`
