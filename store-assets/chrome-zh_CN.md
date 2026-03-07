# Chrome Web Store — GitSyncMarks (中文简体)
<!-- See chrome-meta.md for Privacy, Test Instructions, and Distribution -->

### 名称
GitSyncMarks

• 通知：全部（成功+失败）、仅错误或关闭
• 自动保存：所有设置更改时自动保存 — 无需保存按钮
• 调试日志：Sync标签页 — 启用Sync诊断，导出以排查问题
• 待办投票：社区投票决定下一步开发哪些功能
• 移动伴侣：GitSyncMarks-App（iOS + Android） — 随时随地查看书签，从仓库只读Sync

使用方法：
1. 为书签创建一个GitHub仓库
2. 生成具有"repo"范围的Personal Access Token
3. 使用您的token和仓库配置GitSyncMarks
4. 点击"立即同步" — 完成！

每个书签作为独立的JSON文件存储在您的仓库中，按照书签层级结构组织到文件夹中。README.md在GitHub上直接提供清晰概览；bookmarks.html可导入任何浏览器；feed.xml RSS feed可订阅或用于自动化；dashy-conf.yml为Dashy仪表板提供分区。

自动化：
您无需打开浏览器即可添加书签。GitSyncMarks包含GitHub Actions工作流（add-bookmark.yml），可通过GitHub网页界面或命令行添加书签：

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

您也可以直接在仓库中创建书签文件 — 只需在书签文件夹中添加包含"title"和"url"的JSON文件。扩展程序会在下次Sync时自动检测新文件并将其规范化为标准格式。

GitSyncMarks完全开源：https://github.com/d0dg3r/GitSyncMarks

移动应用：GitSyncMarks-App（iOS + Android） — 随时随地查看书签。只读伴侣；F-Droid和Google Play即将推出。 https://github.com/d0dg3r/GitSyncMarks-App

### Category
效率工具

### Language
中文（简体）
