# 插件

按类型分文件夹，每个插件一个文件夹。**核心**＝缺了 Orbitra 就干不了活，不能卸载、不能停用。

## [Orbitra 本体](app)

内核、界面和桌面外壳；简易版和完整版的安装包，以及就地更新

[Orbitra](app/orbitra)

## [运行方式](harness)

替 Orbitra 跑星织和各 Agent 的 harness；默认是 dsh

[dsh 运行时](harness/dsh) · [Claude Code](harness/claude-code)

## [Agent 包](agent)

每个领域一个 Agent：它的说明、技能和工具清单

[通用 Agent](agent/general) · [自进化 Agent](agent/evolve) · [编码 Agent](agent/code) · [研究 Agent](agent/research) · [写作 Agent](agent/writing) · [运维 Agent](agent/ops) · [测试 Agent](agent/test) · [视频 Agent](agent/video) · [日程 Agent](agent/calendar)

## [功能插件](addon)

独立的功能：装上就能用，单独更新和卸载，不用更新 Orbitra

[使用情况](addon/usage) · [SSH 终端](addon/ssh)

## [能力](capability)

本地能力：核心的随本体，其余的用到再下载

[命令安全检查](capability/safety-net) · [本地向量模型](capability/embed)
