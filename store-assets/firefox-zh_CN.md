# Firefox Add-ons (AMO) — GitSyncMarks (中文简体)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
将Firefox书签与GitHub同步 — 双向、无冲突。单文件JSON存储、三方合并、自动同步。完整支持书签工具栏、菜单和移动端。通过Git、CLI或GitHub Actions添加书签。开源，无中间人。

### Detailed Description
GitSyncMarks将您的Firefox书签与GitHub仓库同步 — 双向、自动，无中间人。

功能：
• 无中间人：直接与GitHub API通信 — 无第三方服务器，无后端，您的数据仅在浏览器和GitHub之间
• 单文件存储：每个书签是一个独立的JSON文件 — 可读且适合diff
• 三方合并：当两端都有更改时自动无冲突同步
• 完整Firefox支持，包括书签菜单文件夹
• 每次书签更改时自动同步（每个配置文件可配置防抖延迟）
• 多个书签配置文件：最多10个配置文件，使用独立GitHub仓库；切换时替换本地书签
• 右键菜单：右键点击页面或链接 — 添加到书签栏、添加到其他书签、立即同步、切换配置文件、复制网站图标URL、下载网站图标
• 收藏图标工具：将任意网站的收藏图标URL复制到剪贴板或下载为PNG — 使用浏览器收藏图标，Google收藏图标服务作为后备
• 自动化：通过Git、CLI或GitHub Actions添加书签 — 无需打开浏览器
• GitHub Repos文件夹：可选文件夹，包含您所有GitHub仓库（公开和私有）的书签
• Sync配置文件：实时、频繁、正常或省电模式
• 启动/聚焦时Sync：浏览器启动或窗口获得焦点时的可选同步（带冷却时间）
• 定期Sync以检测远程更改（1–120分钟，可配置）
• 通过弹窗手动Push、Pull和完整Sync
• 自动合并不可能时的冲突检测
• 生成文件：README.md（概览）、bookmarks.html（浏览器导入）、feed.xml（RSS 2.0 Feed）和dashy-conf.yml（Dashy仪表板） — 每个可配置为关闭、手动或自动
• 设置Git同步：仓库中扩展设置的加密备份 — 全局（共享）或个人（按设备）模式；从其他设备导入设置；所有设备相同密码，自动同步
• 导入/导出：书签（JSON）、Dashy配置（YAML）或设置（纯JSON / 加密.enc）；导入时自动检测格式
• 完全重置：文件 → 设置中的「重置所有数据」— 清除所有配置文件、令牌和设置（浏览器书签保留）；两步确认
• 设置向导：8步引导式设置，涵盖令牌、仓库和首次同步
• 引导设置：文件夹浏览器选择同步路径；配置新配置文件时创建文件夹或拉取书签
• 多语言：12种语言 — EN、DE、FR、ES、PT-BR、IT、JA、ZH-CN、KO、RU、TR、PL；手动选择或自动检测
• 键盘快捷键：快速Sync（Ctrl+Shift+.）、打开设置（Ctrl+Shift+,） — 可自定义
• 主题：浅色、深色或自动 — 循环切换按钮（A → 深色 → 浅色 → A）在选项和弹窗中
• 选项：5个标签页（GitHub、Sync、文件、帮助、关于）及GitHub和文件的子标签页 — 整洁有序的设置界面
• 通知：全部（成功+失败）、仅错误或关闭
• 自动保存：所有设置更改时自动保存 — 无需保存按钮
• 调试日志：Sync标签页 — 启用Sync诊断，导出以排查问题
• 待办投票：社区投票影响下一个功能优先级
• 移动应用：GitSyncMarks-Mobile（iOS + Android） — 随时随地查看书签，从仓库只读同步

使用方法：
1. 创建一个GitHub仓库用于存放书签
2. 生成具有"repo"范围的Personal Access Token
3. 用您的Token和仓库配置GitSyncMarks
4. 点击"立即同步" — 完成！

每个书签作为独立的JSON文件存储在您的仓库中，按照Firefox书签层级（书签工具栏、书签菜单、其他书签）组织到文件夹中。README.md在GitHub上直接提供概览；bookmarks.html可导入任何浏览器；feed.xml RSS Feed可用于订阅或自动化；dashy-conf.yml为Dashy仪表板提供分区。

自动化：
您可以不打开Firefox就添加书签。GitSyncMarks包含一个GitHub Actions工作流（add-bookmark.yml），允许您通过GitHub网页界面或命令行添加书签：

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

您也可以直接在仓库中创建书签文件 — 只需在任意书签文件夹中添加包含"title"和"url"的JSON文件。扩展会在下次同步时自动检测新文件。

GitSyncMarks完全开源：https://github.com/d0dg3r/GitSyncMarks

移动应用：GitSyncMarks-Mobile（iOS + Android） — 随时随地查看书签。只读伴侣应用；F-Droid和Google Play即将推出。https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
书签

### Tags
bookmarks, sync, github, backup, automation
