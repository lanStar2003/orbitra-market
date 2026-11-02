# Orbitra 市场

Orbitra 是以 harness 为核心的个人 AI 助理：桌面级软件，Windows、macOS、Linux，手机连上来用，多端互通。这里是它的市场：最新的安装包和全部插件。

- **安装包**分简易版和完整版，在下面的表里下载（它们太大，放在 Release 里）；装好的 Orbitra 从这里自动更新。
- **插件**放在 [plugins](plugins) 里，按类型分文件夹：Orbitra 本体、运行方式（harness）、Agent 包、能力。标着**核心**的缺了 Orbitra 就干不了活：完整版自带，简易版第一次启动时自动下载。
- 目录在 [market.json](market.json)（给 Orbitra 检索用），这份说明和它都是生成的，Orbitra 每发一个版本就刷新一次；Orbitra 自己在 插件 › 市场 里显示同样的内容。
- 设备装任何东西之前都会验证：就地更新和 Agent 包验发布机的签名，安装包验 sha512。

## 下载

Orbitra **1.4.2**。新版本 1.5.0 的安装包还在打包，下面是 1.4.2 的。

| 平台 | 简易版 | 完整版 |
|---|---|---|
| Windows（x64） | [Orbitra-Lite-Setup-1.4.2.exe](https://github.com/lanStar2003/orbitra-market/releases/download/v1.4.2/Orbitra-Lite-Setup-1.4.2.exe)（129 MB） | [Orbitra-Setup-1.4.2.exe](https://github.com/lanStar2003/orbitra-market/releases/download/v1.4.2/Orbitra-Setup-1.4.2.exe)（219 MB） |
| macOS（Apple 芯片） | [Orbitra-Lite-1.4.2-arm64.dmg](https://github.com/lanStar2003/orbitra-market/releases/download/v1.4.2/Orbitra-Lite-1.4.2-arm64.dmg)（169 MB） | [Orbitra-1.4.2-arm64.dmg](https://github.com/lanStar2003/orbitra-market/releases/download/v1.4.2/Orbitra-1.4.2-arm64.dmg)（352 MB） |
| macOS（Intel） | [Orbitra-Lite-1.4.2-x64.dmg](https://github.com/lanStar2003/orbitra-market/releases/download/v1.4.2/Orbitra-Lite-1.4.2-x64.dmg)（173 MB） | [Orbitra-1.4.2-x64.dmg](https://github.com/lanStar2003/orbitra-market/releases/download/v1.4.2/Orbitra-1.4.2-x64.dmg)（361 MB） |
| Linux（AppImage） | [Orbitra-Lite-1.4.2.AppImage](https://github.com/lanStar2003/orbitra-market/releases/download/v1.4.2/Orbitra-Lite-1.4.2.AppImage)（168 MB） | [Orbitra-1.4.2.AppImage](https://github.com/lanStar2003/orbitra-market/releases/download/v1.4.2/Orbitra-1.4.2.AppImage)（305 MB） |
| Linux（deb：Debian / Ubuntu） | [orbitra-lite_1.4.2_amd64.deb](https://github.com/lanStar2003/orbitra-market/releases/download/v1.4.2/orbitra-lite_1.4.2_amd64.deb)（131 MB） | [orbitra_1.4.2_amd64.deb](https://github.com/lanStar2003/orbitra-market/releases/download/v1.4.2/orbitra_1.4.2_amd64.deb)（246 MB） |

- **简易版**：越小越好，只有 Orbitra 本体；第一次启动从 npm 下载 dsh 运行时（约两分钟，国内慢可以在 core.yml 里把 registry 换成 npmmirror），下完才能派活。
- **完整版**：自带 dsh 运行时，装好就能离线用。
- 两个版本都不带本地向量模型：在 插件 › 市场 里点「安装」才下载。装好的 Orbitra 从这里自动更新（简易版读 `lite*.yml`，完整版读 `latest*.yml`），就地更新读 Release 里的 `manifest.json` + `files.zip`，都先验签名或 sha512。

## 插件

全部放在 [plugins](plugins) 里，每种类型一个文件夹，每个插件一个文件夹。**核心**＝缺了 Orbitra 就干不了活，不能卸载、不能停用。

### [Orbitra 本体](plugins/app)

内核、界面和桌面外壳；简易版和完整版的安装包，以及就地更新

| 名称 | 版本 | 核心 | 简易版 | 完整版 | 说明 | 获取 |
|---|---|---|---|---|---|---|
| [Orbitra](plugins/app/orbitra) | 1.5.0 | **核心** | 自带 | 自带 | Orbitra 本体：内核、界面、桌面外壳和 Orbitra 自己的 dsh 插件。 | [安装包](#下载) |

### [运行方式](plugins/harness)

替 Orbitra 跑总指挥和各 Agent 的 harness；默认是 dsh

| 名称 | 版本 | 核心 | 简易版 | 完整版 | 说明 | 获取 |
|---|---|---|---|---|---|---|
| [dsh 运行时](plugins/harness/dsh) | 0.2.1-rc.2 | **核心** | 第一次启动下载 | 自带 | 私有的 dsh（DeepSeek Harness）、dsh-mnemon 和 Mnemon，钉死版本，装在数据文件夹里；Orbitra 的 7 个 dsh 插件随本体。默认的运行方式。（解开后约 850 MB） | [@deepseek-ai/dsh](https://www.npmjs.com/package/@deepseek-ai/dsh)、[@mnemon-dev/mnemon](https://www.npmjs.com/package/@mnemon-dev/mnemon)、[dsh-mnemon](https://www.npmjs.com/package/dsh-mnemon) |
| [Claude Code](plugins/harness/claude-code) | 稍后 | 可选 | 稍后 | 稍后 | 用 Claude Code 跑指定的 Agent。 | — |

### [Agent 包](plugins/agent)

每个领域一个 Agent：它的说明、技能和工具清单

| 名称 | 版本 | 核心 | 简易版 | 完整版 | 说明 | 获取 |
|---|---|---|---|---|---|---|
| [通用 Agent](plugins/agent/general) | 1.0.0 | **核心** | 自带 | 自带 | 没有对口的 Agent 时先把事办完，并记下能力缺口 | 这个文件夹 |
| [自进化 Agent](plugins/agent/evolve) | 1.1.0 | **核心** | 自带 | 自带 | 分析运行数据提出优化建议；按主人的需求改 Agent 的做事方式，或直接改 Orbitra 自己的代码（测过、复核过再等主人批准发布） | 这个文件夹 |
| [编码 Agent](plugins/agent/code) | 1.0.0 | 可选 | 自带 | 自带 | 读写代码、复现问题、修复和重构；代码只在工作区里跑 | 这个文件夹 |
| [研究 Agent](plugins/agent/research) | 1.0.0 | 可选 | 自带 | 自带 | 检索、读论文和文档，给出可核验的出处 | 这个文件夹 |
| [写作 Agent](plugins/agent/writing) | 1.0.0 | 可选 | 自带 | 自带 | 学习笔记、文章、周报；按主人的模板和语气写 | 这个文件夹 |
| [运维 Agent](plugins/agent/ops) | 1.0.0 | 可选 | 自带 | 自带 | 发布、部署、巡检服务器；生产环境的每次变更都要主人批准 | 这个文件夹 |
| [测试 Agent](plugins/agent/test) | 1.0.0 | 可选 | 自带 | 自带 | 写测试、跑回归和端到端测试，给出能复现的失败报告 | 这个文件夹 |
| [视频 Agent](plugins/agent/video) | 1.0.0 | 可选 | 自带 | 自带 | 讲解视频：脚本、分镜、Remotion 工程和渲染 | 这个文件夹 |
| [日程 Agent](plugins/agent/calendar) | 1.0.0 | 可选 | 自带 | 自带 | 日历、提醒、邮件摘要；替主人排时间，不替主人回复别人 | 这个文件夹 |

### [能力](plugins/capability)

可选的本地能力，用到再下载

| 名称 | 版本 | 核心 | 简易版 | 完整版 | 说明 | 获取 |
|---|---|---|---|---|---|---|
| [本地向量模型](plugins/capability/embed) | 4.3.2 | 可选 | 用到再装 | 用到再装 | 记忆的向量召回：在本机 CPU 上算向量（transformers.js + onnxruntime，bge-small-zh-v1.5）。没装时召回用关键词和图。（解开后约 490 MB） | [@huggingface/transformers](https://www.npmjs.com/package/@huggingface/transformers) |

---

目录：[market.json](market.json)（格式 `orbitra-market/1`） · 发布机公钥指纹 `2838-d425-6b4d-9b6c` · 更新于 2026-11-02
