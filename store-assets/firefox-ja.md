# Firefox Add-ons (AMO) — GitSyncMarks (日本語)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Firefoxのブックマークをお手元のGitHubリポジトリと双方向・競合なしで同期。ファイル単位のJSON保存、三方マージ、自動同期。ブックマークツールバー・メニュー・モバイルに完全対応。Git、CLI、GitHub Actionsで追加可能。オープンソース、仲介なし。

### Detailed Description
GitSyncMarksは、FirefoxのブックマークをGitHubリポジトリと同期します — 双方向、自動、仲介なし。

機能:
• 仲介なし: GitHub APIと直接通信 — サードパーティサーバーなし、バックエンドなし、データはブラウザとGitHubの間にのみ存在
• ファイル単位の保存: 各ブックマークは個別のJSONファイル — 人間が読みやすくdiffに最適
• 三方マージ: 両側で変更があっても自動で競合なく同期
• Firefoxの完全サポート（ブックマークメニューフォルダを含む）
• ブックマーク変更ごとの自動同期（プロファイルごとにデバウンス設定可能）
• 複数のブックマークプロファイル: 最大10プロファイル、個別のGitHubリポジトリ対応; 切り替え時にローカルブックマークを置換
• コンテキストメニュー: ページやリンクを右クリック — ツールバーに追加、その他のブックマークに追加、今すぐ同期、プロファイルを切り替え、ファビコンURLコピー、ファビコンダウンロード
• ファビコンツール：任意のサイトのファビコンURLをクリップボードにコピーまたはPNGとしてダウンロード — ブラウザのファビコンを使用し、Googleファビコンサービスをフォールバック
• 自動化: Git、CLI、またはGitHub Actionsでブックマークを追加 — ブラウザ不要
• GitHub Reposフォルダ: すべてのGitHubリポジトリ（パブリック・プライベート）へのブックマークを含むオプションフォルダ
• Syncプロファイル: リアルタイム、頻繁、通常、省電力
• 起動時/フォーカス時のSync: ブラウザ起動時またはフォーカス取得時のオプション同期（クールダウン付き）
• リモート変更検出のための定期Sync（1〜120分、設定可能）
• ポップアップからの手動Push、Pull、フルSync
• 自動マージ不可能時の競合検出
• 生成ファイル: README.md（概要）、bookmarks.html（ブラウザインポート）、feed.xml（RSS 2.0フィード）、dashy-conf.yml（Dashyダッシュボード） — 各ファイルをオフ、手動、自動で設定可能
• 設定のGit同期: リポジトリ内の拡張機能設定の暗号化バックアップ — グローバル（共有）または個別（デバイスごと）モード; 他のデバイスから設定をインポート; すべてのデバイスで同じパスワード、自動同期
• インポート/エクスポート: ブックマーク（JSON）、Dashy設定（YAML）、または設定（プレーンJSON / 暗号化.enc）; 自動フォーマット検出によるインポート
• 完全リセット: ファイル → 設定の「すべてのデータをリセット」— すべてのプロファイル、トークン、設定をクリア（ブラウザのブックマークは保持）; 2段階確認
• セットアップウィザード: トークン、リポジトリ、初回同期のための8ステップガイド
• オンボーディング: フォルダブラウザで同期パスを選択; 新しいプロファイル設定時にフォルダ作成またはブックマーク取得
• 多言語対応: 12言語 — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; 手動選択または自動検出
• キーボードショートカット: クイックSync（Ctrl+Shift+.）、設定を開く（Ctrl+Shift+,） — カスタマイズ可能
• テーマ: ライト、ダーク、または自動 — サイクルボタン（A → ダーク → ライト → A）オプションとポップアップで
• オプション: 5つのタブ（GitHub、Sync、ファイル、ヘルプ、About）とGitHub・ファイルのサブタブ — 整理された設定UI
• 通知: すべて（成功+失敗）、エラーのみ、またはオフ
• 自動保存: すべての設定は変更時に自動保存 — 保存ボタンなし
• デバッグログ: Syncタブ — Sync診断の有効化、トラブルシューティング用エクスポート
• バックログ投票: コミュニティ投票で次の機能の優先順位を決定
• モバイルアプリ: GitSyncMarks-App（iOS + Android） — 外出先でブックマークを閲覧、リポジトリからの読み取り専用同期

使い方:
1. ブックマーク用のGitHubリポジトリを作成
2. "repo"スコープのPersonal Access Tokenを生成
3. GitSyncMarksにトークンとリポジトリを設定
4. 「今すぐ同期」をクリック — 完了！

各ブックマークはリポジトリ内の個別のJSONファイルとして保存され、Firefoxのブックマーク階層（ブックマークツールバー、ブックマークメニュー、他のブックマーク）を反映するフォルダに整理されます。README.mdはGitHub上で直接概要を提供し、bookmarks.htmlは任意のブラウザにインポート可能、feed.xml RSSフィードは購読や自動化に使用可能、dashy-conf.ymlはDashyダッシュボードのセクションを提供します。

自動化:
Firefoxを開かずにブックマークを追加できます。GitSyncMarksにはGitHub Actionsワークフロー（add-bookmark.yml）が含まれており、GitHub WebUIまたはコマンドラインからブックマークを追加できます:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

リポジトリ内に直接ブックマークファイルを作成することもできます — 任意のブックマークフォルダに"title"と"url"を含むJSONファイルを追加するだけです。拡張機能は次回のSync時に新しいファイルを自動的に検出します。

GitSyncMarksは完全にオープンソースです: https://github.com/d0dg3r/GitSyncMarks

モバイルアプリ: GitSyncMarks-App（iOS + Android） — 外出先でブックマークを閲覧。読み取り専用コンパニオン; F-DroidとGoogle Playは近日公開予定。https://github.com/d0dg3r/GitSyncMarks-App

### Categories
ブックマーク

### Tags
bookmarks, sync, github, backup, automation
