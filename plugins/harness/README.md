# 运行方式

替 Orbitra 跑总指挥和各 Agent 的 harness；默认是 dsh

共 1 个。

| 名称 | 版本 | 核心 | 简易版 | 完整版 | 说明 |
|---|---|---|---|---|---|
| [dsh 运行时](dsh) | 0.2.1-rc.2 | **核心** | 第一次启动下载 | 自带 | 私有的 dsh（DeepSeek Harness）、dsh-mnemon 和 Mnemon，钉死版本，装在数据文件夹里；Orbitra 的 7 个 dsh 插件随本体。默认的运行方式。（解开后约 850 MB） |
| [Claude Code](claude-code) | 稍后 | 可选 | 稍后 | 稍后 | 用 Claude Code 跑指定的 Agent。 |
