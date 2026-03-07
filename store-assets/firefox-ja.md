# Firefox Add-ons (AMO) — GitSyncMarks (日本語)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### 名前
GitSyncMarks

### 概要 (最大250文字)
GitHub経由のブックマーク同期。Linkwarden連携、スマート検索、コンパニオンアプリ搭載。双方向、安全、かつプライベート。ネイティブなメニュー構造を含むFirefoxへの完全対応。仲介者なし。

### 詳細説明
GitSyncMarksは、ブックマークをGitHubリポジトリと自動的かつ双方向に同期するFirefox用のプロフェッショナルな拡張機能です。ChromeやFirefoxなどのデスクトップはもちろん、GitSyncMarksコンパニオンアプリを使用して外出先でもデータを管理できます。仲介者やサードパーティサーバーは一切介さず、完全なコントロールとプライバシーを保証します。

ハイライト

- Linkwardenシナジー：ページやリンクをLinkwardenインスタンスに直接保存。ビューポートの自動スクリーンショット、コレクション同期、定義済みタグ機能を搭載。
- スマート検索：ブックマーク専用の超高速検索インターフェース。ライト/ダークテーマに対応し、完全なキーボード操作が可能です。
- ガイド付きセットアップウィザード：トークンやリポジトリの設定から最初の同期成功まで、ステップバイステップで新規ユーザーを案内します。
- 3ウェイマージ：複数のデバイスからの変更をインテリジェントに統合する高度なアルゴリズムにより、産業レベルの信頼性を実現。

主な機能

- プライバシー設計：GitHub APIと直接通信。第三者にデータが見られることはありません。
- Firefox最適化：ネイティブなブックマーク構造（ツールバー、メニュー、その他）をサポート。
- ファイルベースの保存：各ブックマークは読み取り可能なJSONファイルとして保存。GitHub上でのバージョン管理や手動編集に最適です。
- マルチプロフィール：仕事用や個人用など、最大10個の個別プロフィールを別々のリポジトリで管理可能。
- 自動化：CLIやGitHub Actions経由でブックマークを追加でき、次回の同期時に自動的に統合されます。
- 生成ファイル：リポジトリ内にREADME.md（概要）、bookmarks.html（インポート用ファイル）、RSSフィードを自動生成。

インストールと設定

1. インストール：Firefox Add-ons (AMO) から GitSyncMarks をインストール。
2. GitHub PAT：「repo」スコープ (classic) または 「Contents: Read/Write」 (fine-grained)を持つ個人アクセストークンを作成。
3. セットアップウィザード：ヘルプ -> はじめにからガイドに従って同期を開始。
4. Linkwarden（任意）：Linkwardenタブでインスタンスを設定。

コンパニオンアプリ
GitSyncMarks-App（Android、iOS、デスクトップ）を使用して、モバイルデバイスからGitHubリポジトリのブックマークを直接管理できます。（注：Android版Firefoxは拡張機能によるブックマークの直接同期をサポートしていないため、代わりに本アプリをご利用ください）。

GitSyncMarksはオープンソースです：https://github.com/d0dg3r/GitSyncMarks

### Categories
ブックマーク

### Tags
bookmarks, sync, github, backup, automation
