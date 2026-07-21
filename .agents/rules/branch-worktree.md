# ブランチ・ワークツリー運用ルール（常時オン / 必読）

> このファイルは Google Antigravity などが**起動時に読む常時オンのワークスペースルール**です（`.agents/rules/`）。
> 内容の正（Single Source of Truth）はリポジトリ直下の **`AGENTS.md`** / **`CLAUDE.md`**。齟齬があれば `AGENTS.md` を優先すること。
> Codex は直下の `AGENTS.md` を直接読むため、このファイルは主に Antigravity 向けの再掲です。

新しい作業を始める前に、必ず次に従う。

## 必ず守る（禁止事項つき）
- **新規ブランチは必ず `develop` から切る**（`main` から切らない）。
- **PR は必ず `develop` に向けて出す**。`main` / `develop` へ**直接 push しない**（保護ブランチ・機構で拒否される）。
- **1ブランチ＝1機能/1タスク**。
- ブランチ名は **`<type>/<kebab-scope>`**（`type` = `feature|fix|docs|chore|refactor`）。
  **半角英小文字・数字・ハイフンのみ**（日本語・空白・大文字・`_` 禁止）。例: `feature/sc01-check-ui`
- コミットは **`<type>: <要約>`**（`type` = `feat|fix|docs|refactor|test|chore`）。

## ワークツリーで作業（必須）
- 作業は**毎回 `git worktree` で専用ディレクトリを分けてから始める**。単独タスクでも例外にしない（メイン作業ディレクトリで直接 `git switch -c` しない）。
- worktree の置き場所は**リポジトリの外**（例: `../wt-<scope>`）。リポジトリ内に作らない。
- 標準フロー:
  ```bash
  git switch develop && git pull
  git worktree add ../wt-<scope> -b <type>/<scope> develop
  cd ../wt-<scope>
  # 実装 → commit（<type>: <要約>）
  git push -u origin <type>/<scope>
  gh pr create --base develop
  # マージ後: ブランチ削除 → git worktree remove ../wt-<scope> → 各自 develop を pull
  ```
- 使い終わった worktree は掃除する（`git worktree list` で確認 → `git worktree remove ../wt-<scope>`）。

## 共有ファイル
- `app/css/style.css` / `app/js/state.js` / `app/js/main.js` は村上（`itiwoja`）が一次管理。
  これらに触れる PR は**村上をレビュアーに指定**する（`gh pr create --base develop --reviewer itiwoja ...`）。

---
詳細な手順・背景は `AGENTS.md` の「ブランチ運用ルール（必読）」「ワークツリーでの作業（必須）」、および `docs/dev/ブランチ運用ルール_v1.0.md` を参照。
