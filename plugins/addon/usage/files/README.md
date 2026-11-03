# 使用情况

看模型花了多少钱：按模型、线路、Agent、来源、对话、任务、时段拆开看，含缓存，每一步都能查到。数据和价格来自内核的账本（`core/modules/ledger`），这个插件只负责分析和页面。

分析的维度、任务类型规则和「一次改对」的算法参考 [CodeBurn](https://github.com/getagentseal/codeburn)（MIT）。

写新的功能插件可以照这个文件夹：`plugin.json`、`core/index.js`、`web/index.jsx`、`test/`，规矩在 `docs/设计-1.9.md` §3。
