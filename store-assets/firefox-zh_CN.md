# Firefox Add-ons (AMO) — GitSyncMarks (中文简体)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
通过 GitHub、GitLab、Codeberg、Gitea 等同步书签。Linkwarden、Smart Search、Bitwarden 备份、引导式向导。双向、安全、私密。完整 Firefox 支持。无中间商。

### Detailed Description
GitSyncMarks 与 GitHub、GitLab、Codeberg、Gitea、Forgejo 或 Gogs 双向同步您的书签。无中间商，无第三方服务器 – 您的数据完全由您掌控。

亮点

- 多提供商 Git 同步：GitHub、GitLab、Codeberg、Gitea、Forgejo 或 Gogs — 每个配置文件可使用各自的提供商和服务器 URL。
- 配置文件转移与推送镜像：在配置文件之间复制书签（替换或合并）；每次同步后可选仅推送备份远程。
- 实时同步进度：推送、拉取和切换配置文件时显示步骤文本（如 `3 / 12 文件` 或 `1 / 3` 步骤）。
- Bitwarden / Vaultwarden Git 备份：在仓库中存储密码保护的保险库导出，可选额外加密；列出、下载或删除远程备份。
- 嵌套卡片 UI：选项、设置向导、弹出窗口和搜索中更清晰的分组区域。
- 同步历史与恢复：浏览历史提交，通过 diff 预览更改，一键恢复任何先前状态。
- 清理远程孤立文件：预览并删除本地已不存在的远程书签文件。
- Linkwarden 协同：将页面或链接直接保存到 Linkwarden 实例 — 视口截图、集合同步和预定义标签。
- Smart Search：专用极速书签搜索，支持浅色/深色主题和完整键盘导航。
- 引导式设置向导：连接测试仅验证访问权限；您选择拉取、合并/同步、推送、文件夹设置或跳过 — 写入仓库前需确认。
- Codeberg / Gitea 性能：Gitea 系列主机上快速的 git tree + blob 读取和单提交推送（必要时 Contents API 回退）。
- 上下文菜单：快速文件夹、书签搜索弹出窗口、打开文件夹全部、favicon 复制/下载及右键配置文件操作。
- 设置 Git 同步：仓库中的加密设置备份（`settings.enc`）— 跨设备共享配置。

核心功能

- 隐私设计：直接与 Git 提供商 API 通信。无第三方查看您的数据。
- Firefox 优化：支持原生结构（工具栏、菜单、其他）。
- 三方合并：工业级同步自动处理多设备上的并发更改。
- 单文件存储：每个书签为可读的 JSON 文件 – 适合版本控制和手动编辑。
- 多配置文件：最多 10 个独立配置文件（工作、个人、项目），各有独立仓库。
- 自动化：通过 CLI 或 GitHub Actions 添加书签；扩展在下次同步时自动集成。
- 生成文件：README.md（概览）、bookmarks.html（导入）、RSS 订阅和 dashy-conf.yml — 可按文件选择。
- 设计与 i18n：浅色、深色和系统自动主题；可调 UI 密度（紧凑 / 中等 / 大）；12 种语言。

配套应用
使用 GitSyncMarks-App（Android、iOS、Desktop）在移动设备上直接从 Git 仓库管理书签。（注：Firefox for Android 不支持通过扩展直接同步书签 – 请使用应用。）

GitSyncMarks 是开源项目：https://github.com/d0dg3r/GitSyncMarks

### Categories
Bookmarks

### Tags
bookmarks, sync, github, gitlab, backup, automation
