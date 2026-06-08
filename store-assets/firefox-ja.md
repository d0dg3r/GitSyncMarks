# Firefox Add-ons (AMO) — GitSyncMarks (日本語)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
GitHub、GitLab、Codeberg、Gitea などでブックマーク同期。Linkwarden、Smart Search、Bitwarden バックアップ、ガイド付きウィザード。双方向、安全、プライベート。Firefox 完全対応。中間サーバーなし。

### Detailed Description
GitSyncMarks は GitHub、GitLab、Codeberg、Gitea、Forgejo、Gogs とブックマークを双方向同期します。中間サーバーなし、第三者サーバーなし – データは完全にあなたの管理下にあります。

ハイライト

- マルチプロバイダ Git 同期：GitHub、GitLab、Codeberg、Gitea、Forgejo、Gogs — プロファイルごとにプロバイダとサーバー URL を設定可能。
- プロファイル転送とプッシュミラー：プロファイル間でブックマークをコピー（置換またはマージ）；各同期後のオプション push-only バックアップリモート。
- ライブ同期進捗：プッシュ、プル、プロファイル切替中のステップ表示（例：`3 / 12 ファイル` または `1 / 3` ステップ）。
- Bitwarden / Vaultwarden Git バックアップ：パスワード保護された vault エクスポートをリポジトリに保存、オプションの追加暗号化；リモートバックアップの一覧、ダウンロード、削除。
- ネストカード UI：オプション、セットアップウィザード、ポップアップ、検索でより明確なグループ化セクション。
- 同期履歴と復元：過去のコミットを閲覧、diff プレビューで変更を確認、ワンクリックで以前の状態に復元。
- リモート孤立ファイルのクリーンアップ：ローカルに存在しないリモートブックマークファイルをプレビューして削除。
- Linkwarden 連携：ページやリンクを Linkwarden インスタンスに直接保存 — ビューポートスクリーンショット、コレクション同期、事前定義タグ。
- Smart Search：専用の高速ブックマーク検索、ライト/ダークテーマ、完全なキーボード操作。
- ガイド付きセットアップウィザード：接続テストはアクセス検証のみ；プル、マージ/同期、プッシュ、フォルダ設定、スキップを選択 — リポジトリへの書き込み前に確認。
- Codeberg / Gitea パフォーマンス：Gitea 系ホストでの高速 git tree + blob 読み取りとシングルコミットプッシュ（必要時 Contents API フォールバック）。
- コンテキストメニュー：クイックフォルダ、ブックマーク検索ポップアップ、フォルダ内をすべて開く、favicon コピー/ダウンロード、右クリックからプロファイル操作。
- 設定 Git 同期：リポジトリ内の暗号化設定バックアップ（`settings.enc`）— デバイス間で設定を共有。

主要機能

- プライバシー by design：Git プロバイダ API との直接通信。第三者はデータを見られません。
- Firefox 最適化：ネイティブ構造（ツールバー、メニュー、その他）をサポート。
- 三者マージ：複数デバイスでの同時変更を自動処理する産業グレードの同期。
- 単一ファイルストレージ：各ブックマークは読み取り可能な JSON ファイル – バージョン管理と手動編集に最適。
- 複数プロファイル：仕事、個人、プロジェクト用に最大 10 プロファイル、それぞれ独自のリポジトリ。
- 自動化：CLI または GitHub Actions でブックマークを追加；次回同期時に拡張機能が統合。
- 生成ファイル：README.md（概要）、bookmarks.html（インポート）、RSS フィード、dashy-conf.yml — ファイルごとにオプション。
- デザインと i18n：ライト、ダーク、システム自動テーマ；UI 密度調整（コンパクト / 中 / 大）；12 言語。

コンパニオンアプリ
GitSyncMarks-App（Android、iOS、Desktop）でモバイルから Git リポジトリのブックマークを直接管理。（注：Firefox for Android は拡張機能による直接ブックマーク同期をサポートしていません – アプリをご利用ください。）

GitSyncMarks はオープンソース：https://github.com/d0dg3r/GitSyncMarks

### Categories
Bookmarks

### Tags
bookmarks, sync, github, gitlab, backup, automation
