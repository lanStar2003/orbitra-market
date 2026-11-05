# Orbitra 市场

Orbitra 是以 harness 为核心的个人 AI 助理：桌面级软件，Windows、macOS、Linux，手机连上来用，多端互通。这里是它的市场：最新的安装包和全部插件。

- **安装包**在下面的表里下载（它们太大，放在 Release 里）；装好的 Orbitra 从这里自动更新。
- **插件**放在 [plugins](plugins) 里，按类型分文件夹：Orbitra 本体、运行方式（harness）、Agent 包、能力。标着**核心**的缺了 Orbitra 就干不了活：安装包都带着。
- 目录在 [market.json](market.json)（给 Orbitra 检索用），这份说明和它都是生成的，Orbitra 每发一个版本就刷新一次；Orbitra 自己在 插件 › 市场 里显示同样的内容。
- 设备装任何东西之前都会验证：就地更新和 Agent 包验发布机的签名，安装包验 sha512。

## 下载

Orbitra **1.17.0**，2026-11-05 发布（[Release 页面](https://github.com/lanStar2003/orbitra-market/releases/tag/v1.17.0)）。

| 平台 | 安装包 |
|---|---|
| Windows（x64） | [Orbitra-Setup-1.17.0.exe](https://github.com/lanStar2003/orbitra-market/releases/download/v1.17.0/Orbitra-Setup-1.17.0.exe)（206 MB） |
| macOS（Apple 芯片） | [Orbitra-1.17.0-arm64.dmg](https://github.com/lanStar2003/orbitra-market/releases/download/v1.17.0/Orbitra-1.17.0-arm64.dmg)（286 MB） |
| Linux（AppImage） | [Orbitra-1.17.0.AppImage](https://github.com/lanStar2003/orbitra-market/releases/download/v1.17.0/Orbitra-1.17.0.AppImage)（281 MB） |
| Linux（deb：Debian / Ubuntu） | [orbitra_1.17.0_amd64.deb](https://github.com/lanStar2003/orbitra-market/releases/download/v1.17.0/orbitra_1.17.0_amd64.deb)（216 MB） |

- 安装包自带 dsh 运行时，装好就能离线用。
- 不带本地向量模型：在 插件 › 市场 里点「安装」才下载。装好的 Orbitra 从这里自动更新（读 `latest*.yml`；以前装简易版的读 `lite*.yml`，内容相同，更新后就换成这个安装包），就地更新读 Release 里的 `manifest.json` + `files.zip`，都先验签名或 sha512。

## 插件

全部放在 [plugins](plugins) 里，每种类型一个文件夹，每个插件一个文件夹。**核心**＝缺了 Orbitra 就干不了活，不能卸载、不能停用。

### [Orbitra 本体](plugins/app)

内核、界面和桌面外壳；简易版和完整版的安装包，以及就地更新

| 名称 | 版本 | 核心 | 安装包 | 说明 | 获取 |
|---|---|---|---|---|---|
| [Orbitra](plugins/app/orbitra) | 1.17.0 | **核心** | 自带 | Orbitra 本体：内核、界面、桌面外壳和 Orbitra 自己的 dsh 插件。 | [安装包](#下载) |

### [运行方式](plugins/harness)

替 Orbitra 跑总指挥和各 Agent 的 harness；默认是 dsh

| 名称 | 版本 | 核心 | 安装包 | 说明 | 获取 |
|---|---|---|---|---|---|
| [dsh 运行时](plugins/harness/dsh) | 0.2.1-rc.2 | **核心** | 自带 | 私有的 dsh（DeepSeek Harness）、dsh-mnemon 和 Mnemon，钉死版本，装在数据文件夹里；Orbitra 的 7 个 dsh 插件随本体。默认的运行方式。（解开后约 850 MB） | [@deepseek-ai/dsh](https://www.npmjs.com/package/@deepseek-ai/dsh)、[@mnemon-dev/mnemon](https://www.npmjs.com/package/@mnemon-dev/mnemon)、[dsh-mnemon](https://www.npmjs.com/package/dsh-mnemon) |
| [Claude Code](plugins/harness/claude-code) | 稍后 | 可选 | 稍后 | 用 Claude Code 跑指定的 Agent。 | — |

### [Agent 包](plugins/agent)

每个领域一个 Agent：它的说明、技能和工具清单

| 名称 | 版本 | 核心 | 安装包 | 说明 | 获取 |
|---|---|---|---|---|---|
| [通用 Agent](plugins/agent/general) | 1.0.0 | **核心** | 自带 | 没有对口的 Agent 时先把事办完，并记下能力缺口 | 这个文件夹 |
| [自进化 Agent](plugins/agent/evolve) | 1.1.2 | **核心** | 自带 | 分析运行数据提出优化建议；按主人的需求改 Agent 的做事方式，或直接改 Orbitra 自己的代码（测过、复核过再等主人批准发布） | 这个文件夹 |
| [编码 Agent](plugins/agent/code) | 1.0.1 | 可选 | 自带 | 读写代码、复现问题、修复和重构 | 这个文件夹 |
| [研究 Agent](plugins/agent/research) | 1.0.0 | 可选 | 自带 | 检索、读论文和文档，给出可核验的出处 | 这个文件夹 |
| [写作 Agent](plugins/agent/writing) | 1.0.0 | 可选 | 自带 | 学习笔记、文章、周报；按主人的模板和语气写 | 这个文件夹 |
| [运维 Agent](plugins/agent/ops) | 1.0.0 | 可选 | 自带 | 发布、部署、巡检服务器；生产环境的每次变更都要主人批准 | 这个文件夹 |
| [测试 Agent](plugins/agent/test) | 1.0.1 | 可选 | 自带 | 写测试、跑回归和端到端测试，给出能复现的失败报告 | 这个文件夹 |
| [视频 Agent](plugins/agent/video) | 1.0.0 | 可选 | 自带 | 讲解视频：脚本、分镜、Remotion 工程和渲染 | 这个文件夹 |
| [日程 Agent](plugins/agent/calendar) | 1.0.0 | 可选 | 自带 | 日历、提醒、邮件摘要；替主人排时间，不替主人回复别人 | 这个文件夹 |

### [功能插件](plugins/addon)

独立的功能：装上就能用，单独更新和卸载，不用更新 Orbitra

| 名称 | 版本 | 核心 | 安装包 | 说明 | 获取 |
|---|---|---|---|---|---|
| [使用情况](plugins/addon/usage) | 1.0.1 | 可选 | 自带 | 每一步模型调用花了多少钱：按模型、线路、Agent、来源、对话、任务、时段拆开看，含缓存、子 Agent、审查，附省钱建议。 | 这个文件夹 |
| [SSH 终端](plugins/addon/ssh) | 1.0.0 | 可选 | 用到再装 | 连接服务器的终端、文件管理、快捷命令、无代理监控、端口转发和密钥管理，内核直接用 ssh2 连接，不依赖系统的 ssh。密码和私钥加密存在这台电脑，Agent 用 ssh_run 执行的命令都有记录。 | 这个文件夹 |

### [能力](plugins/capability)

本地能力：核心的随本体，其余的用到再下载

| 名称 | 版本 | 核心 | 安装包 | 说明 | 获取 |
|---|---|---|---|---|---|
| [命令安全检查](plugins/capability/safety-net) | 跟随上游 | **核心** | 自带 | cc-safety-net（MIT）：判断 Agent 要跑的命令有没有破坏性，决定程序直接放行还是送自动审查。不联网、不写文件。随本体，跟随上游自动更新。 | 随安装包 |
| [本地向量模型](plugins/capability/embed) | 4.3.2 | 可选 | 用到再装 | 记忆和资料库的向量检索、重排：在本机 CPU 上跑（transformers.js + onnxruntime，bge-small-zh-v1.5，重排模型另下约 280 MB）。第一次启动后自动下载一次；没装好时按关键词查。（解开后约 490 MB） | [@huggingface/transformers](https://www.npmjs.com/package/@huggingface/transformers) |

---

目录：[market.json](market.json)（格式 `orbitra-market/1`） · 发布机公钥指纹 `2838-d425-6b4d-9b6c` · 更新于 2026-11-05
