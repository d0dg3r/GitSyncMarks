# Chrome Web Store — GitSyncMarks (日本語)
<!-- See chrome-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 132 characters)
ブックマークをGitHubで安全に保管 — ファイル単位の保存、3ウェイマージ同期、Chrome & Firefox対応。サーバー不要。

### Detailed Description
GitSyncMarksは、ブラウザのブックマークをGitHubリポジトリと同期します — 双方向、自動、外部サーバー不要。

機能:
• ファイル単位の保存: 各ブックマークは個別のJSONファイル — 人間が読みやすく、diff対応
• 3ウェイマージ: 両側で変更があっても自動的に競合なしで同期
• クロスブラウザ: Chrome、Chromium、Brave、Edge、Firefoxに対応
• 複数のブックマークプロファイル: 最大10個のプロファイル、個別のGitHubリポジトリ対応; 切替でローカルブックマークを置き換え
• GitHub Reposフォルダ: すべてのGitHubリポジトリ（公開・非公開）へのブックマークを含むオプションフォルダ
• オンボーディング: 新しいプロファイル設定時にフォルダ作成またはブックマークをPull
• Syncプロファイル: リアルタイム、頻繁、通常、省電力（プリセット間隔とデバウンス）
• ブックマーク変更ごとの自動Sync（プロファイルごとにデバウンス設定可能）
• 起動時/フォーカス時のSync: ブラウザ起動時やフォーカス復帰時のオプションSync（クールダウン付き）
• 定期Syncでリモート変更を検出（1〜120分、設定可能）
• 通知: すべて（成功+失敗）、エラーのみ、またはオフ
• ポップアップからの手動Push、Pull、完全Sync
• 自動マージが不可能な場合の競合検出
• 生成ファイル: README.md（概要）、bookmarks.html（ブラウザインポート）、feed.xml（RSS 2.0フィード）、dashy-conf.yml（Dashyダッシュボード） — それぞれオフ、手動、自動に設定可能
• Git設定Sync: リポジトリ内の拡張機能設定の暗号化バックアップ — グローバル（共有）または個別（デバイスごと）モード; 他のデバイスから設定をインポート; すべてのデバイスで同じパスワード、自動同期
• コンテキストメニュー: ページやリンクを右クリック — ツールバーに追加、その他のブックマークに追加、今すぐ同期、ファビコンURLコピー、ファビコンダウンロード
• 自動化: Git、CLI、またはGitHub Actionsでブックマーク追加 — ブラウザ不要
• インポート/エクスポート: ブックマーク（JSON）、Dashy設定（YAML）、または設定（プレーンJSON / 暗号化.enc）のエクスポート; 自動形式検出によるインポート
• 自動保存: すべての設定は変更時に自動保存 — 保存ボタン不要
• オプション: 5つのタブ（GitHub、Sync、ファイル、ヘルプ、バージョン情報）、GitHubとファイルにサブタブ付き — 整理されたUI
• テーマ: ライト、ダーク、または自動 — サイクルボタン（A → ダーク → ライト → A）オプションとポップアップ
• バックログ投票: 次の機能の優先順位を決めるコミュニティ投票
• 多言語: 12言語 — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; 手動選択または自動検出
• キーボードショートカット: クイックSync（Ctrl+Shift+.）、設定を開く（Ctrl+Shift+,） — カスタマイズ可能
• デバッグログ: Syncタブ — Sync診断用に有効化、トラブルシューティング用にエクスポート
• モバイルコンパニオン: GitSyncMarks-Mobile（iOS + Android） — 外出先でブックマークを閲覧、リポジトリからの読み取り専用Sync
• 外部サーバー不要 — Personal Access Tokenを使用してGitHub APIと直接通信

使い方:
1. ブックマーク用のGitHubリポジトリを作成
2. 「repo」スコープのPersonal Access Tokenを生成
3. トークンとリポジトリでGitSyncMarksを設定
4. 「今すぐ同期」をクリック — 完了！

各ブックマークはリポジトリ内に個別のJSONファイルとして保存され、ブックマーク階層を反映したフォルダに整理されます。README.mdはGitHub上で直接概要を表示; bookmarks.htmlは任意のブラウザにインポート可能; feed.xml RSSフィードは購読や自動化に利用可能; dashy-conf.ymlはDashyダッシュボードのセクションを提供します。

自動化:
ブラウザを開かずにブックマークを追加できます。GitSyncMarksにはGitHub Actionsワークフロー（add-bookmark.yml）が含まれており、GitHub WebUIまたはコマンドラインからブックマークを追加できます:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

リポジトリ内に直接ブックマークファイルを作成することもできます — ブックマークフォルダに「title」と「url」を含むJSONファイルを追加するだけです。拡張機能は次回のSync時に新しいファイルを自動検出し、正規形式に正規化します。

GitSyncMarksは完全にオープンソースです: https://github.com/d0dg3r/GitSyncMarks

モバイルアプリ: GitSyncMarks-Mobile（iOS + Android） — 外出先でブックマークを閲覧。読み取り専用; F-DroidとGoogle Playは近日公開予定。 https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
仕事効率化

### Language
日本語
