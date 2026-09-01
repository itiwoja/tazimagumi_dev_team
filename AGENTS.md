# AGENTS.md — tazimagumi_dev_team

田島組 卒業制作（男の身だしなみアプリ）。AIエージェント（Codex / Claude）とメンバー共通の作業ルール。
**スタック：** HTML + CSS + バニラJS（ビルド不要・`app/` 配下）。詳細は `docs/`。

---

## ブランチ運用ルール（必読）

新しい作業を始める前に、必ずこのルールに従ってブランチを作る。
人間向けの詳しい手順は **[`docs/dev/ブランチ運用ルール_v1.0.md`](docs/dev/ブランチ運用ルール_v1.0.md)** を参照。

- **新規ブランチは必ず `develop` から切る**（`main` から切らない）。
- **PR は `develop` に向けて出す**。`main`・`develop` へ直接 push しない。
- ブランチ名は **`<type>/<kebab-scope>`**（例 `feature/sc01-check-ui`）。`type` は `feature|fix|docs|chore|refactor`。
- ブランチ名は **半角英小文字・数字・ハイフンのみ**（日本語・空白・大文字・`_` 禁止）。
- **1ブランチ＝1機能/1タスク**。
- **作業は毎回 `git worktree` で専用ディレクトリを分けてから始める**（メインの作業ディレクトリで直接 `git switch -c` しない）。詳細は後述の「ワークツリーでの作業（必須）」を参照。
- 基盤・共有ファイル（`app/css/style.css`・`app/js/state.js`・`app/js/main.js`）は **村上（itiwoja）が一次管理**。大きな変更は要相談。
- コミットは **`<type>: <要約>`**（`feat|fix|docs|refactor|test|chore`）。

### 標準フロー
```bash
git switch develop && git pull
git worktree add ../wt-<scope> -b <type>/<scope> develop
cd ../wt-<scope>
# 実装 → コミット
git add . && git commit -m "feat: <要約>"
git push -u origin <type>/<scope>
gh pr create --base develop
# レビュー後マージ → ブランチ削除 → git worktree remove ../wt-<scope> → 各自 develop を pull
```

### 機械可読ルール（このブロックを唯一の正とする）
```yaml
branch_rules:
  protected_branches: [main, develop]
  base_branch: develop
  pr_target: develop
  release_branch: main
  naming:
    pattern: "<type>/<kebab-scope>"
    allowed_types: [feature, fix, docs, chore, refactor]
    charset: "a-z 0-9 -"      # 小文字英数とハイフンのみ
    forbidden_in_name: [japanese, whitespace, uppercase, underscore]
    one_branch_one_task: true
  worktree:
    required: true            # 毎回のタスクで git worktree を使う（並行作業に限らない）
    location: outside_repo    # 例: ../wt-<scope>（リポジトリ内には作らない）
  # 担当領域ごとの「代表ブランチ（計画）」。one_branch_one_task のため実ブランチは
  # タスク単位で都度作成し、マージ後は削除する（常設の固定ブランチではない）。
  # 現在オープンな作業ブランチは GitHub を正とする（例: feature/settings-screen ほか）。
  feature_branches:
    - { branch: feature/sc01-check-ui,           owner: ren-1222 }
    - { branch: feature/sc02-roadmap-ui,         owner: ren-1222 }
    - { branch: feature/diagnosis-logic,         owner: kuro1020 }
    - { branch: feature/roadmap-logic,           owner: kuro1020 }
    - { branch: feature/recommend-logic,         owner: takato9310 }
    - { branch: feature/sc03-product-compare-ui, owner: yourenputianjian-sketch }
    - { branch: feature/sc04-record-ui,          owner: yourenputianjian-sketch }
    - { branch: base-and-shared,                 owner: itiwoja }
  shared_files_owner: itiwoja
  shared_files: [app/css/style.css, app/js/state.js, app/js/main.js]
  commit:
    format: "<type>: <summary>"
    allowed_types: [feat, fix, docs, refactor, test, chore]
  workflow:
    - git switch develop
    - git pull
    - git worktree add ../wt-<scope> -b <type>/<scope> develop
    - cd ../wt-<scope>
    - implement + commit (commit.format)
    - git push -u origin <type>/<scope>
    - gh pr create --base develop
    - merge after review, delete branch, git worktree remove ../wt-<scope>, others pull develop
  forbidden:
    - direct push to main or develop
    - creating branches from main
    - multiple features in one branch
    - non-ascii / whitespace / uppercase / underscore in branch name
    - working directly in the main checkout instead of a dedicated worktree
```

### ブランチ保護ルール（GitHub設定）

`main`・`develop` は GitHub 上で保護ブランチとして設定済み（規約だけでなく機構で強制される）。

- **直接pushは拒否される**：PRを経由しないと反映できない。
- **force push禁止・ブランチ削除禁止**（`allow_force_pushes: false` / `allow_deletions: false`）。
- **管理者にも適用**（`enforce_admins: true`）：村上のアカウントでも直接pushはできない。
- 必須レビュー人数はGitHub設定上0件（レビューなしでもマージ可能）だが、運用として共有ファイル（`app/css/style.css`・`app/js/state.js`・`app/js/main.js`）や基盤に関わるPRは**村上のレビューを待ってからマージ**する。
- **必須ステータスチェックは `PR Check`（ジョブ名 `check`）**：CIが red のPRは**マージボタンが機構的に無効**になる（`enforce_admins: true` なので村上も例外なし）。落ちたら原因を直して再pushする。
  - 2026-07-24 に CI red のPR（#184・#165）がマージされ、未解決の競合マーカーが develop に混入してアプリが起動しなくなった（#189 で修復）。この再発防止のため 2026-07-28 に必須化した。
- 保護設定自体（レビュー必須化・ステータスチェック必須化など）を変える場合は村上に確認する。

### レビュー運用（負荷平準化）

Issue #112「負荷平準化」の提案を村上（itiwoja）が承認し、正式な運用ルールとして反映（2026-07-17）。経緯・背景は [`docs/dev/負荷平準化とレビュー運用_v1.0.md`](docs/dev/負荷平準化とレビュー運用_v1.0.md) を参照。

- 共有ファイル（`app/css/style.css`・`app/js/state.js`・`app/js/main.js`）に**触れない**PRは、担当者以外の1人のレビューでマージ可。
- 村上（itiwoja）の必須レビューは、**共有ファイルを触るPRのみ**（上記「ブランチ保護ルール」節と同じ運用）。
- 機械で見られる項目（JS構文・データ検証・ブランチ名・SWキャッシュ更新もれ）はCI（PR Check）に任せる。

### ワークツリーでの作業（必須）

**作業は毎回 `git worktree` で専用ディレクトリを分けてから始める。** 単独のタスクでも例外にしない（メインの作業ディレクトリで直接 `git switch -c` しない）。複数のタスク（別Issue・別ブランチ）を同時に進める時はもちろん、AIエージェントが作業する場合も同様。

```bash
# develop起点で新しいworktreeを作る（リポジトリの外、兄弟ディレクトリに置く）
git worktree add ../wt-<scope> -b <type>/<scope> develop
cd ../wt-<scope>
# 実装 → コミット → push → PR は通常のブランチ運用ルールと同じ
```

- worktreeの置き場所は**リポジトリの外**（例：`../wt-sc02-roadmap-ui`）。リポジトリ内に作ると誤ってgit管理下に入れてしまう恐れがあるため避ける。
- ブランチ命名・1ブランチ1タスク・developから切る、などのルールはworktreeでも変わらない。
- 作業が終わりPRがマージされたら、そのworktreeは片付ける：
```bash
git worktree remove ../wt-<scope>
```
- 既存のworktree一覧は `git worktree list` で確認できる。使い終わって残っているworktreeは掃除する。

### PRの作成

- PRのタイトルはコミット規約と同じ **`<type>: <要約>`**。
- 本文には最低限「やったこと」を書く。関連Issueがあれば `Closes #<番号>` を入れて自動クローズさせる。
- 作業途中で先にレビューをもらいたい時は `--draft` を付けてドラフトPRにする。
- 基本コマンド：
```bash
gh pr create --base develop --title "<type>: <要約>" --body "$(cat <<'EOF'
## 概要
- 何をしたか

## 関連Issue
Closes #<番号>
EOF
)"
```
- **base が `develop` になっているか必ず確認**する（`gh pr create` の出力でもGitHub上でも）。`main` 向けにはPRを出さない（`main`は`develop`からのリリースPRのみ）。
- 共有ファイル（`app/css/style.css`・`app/js/state.js`・`app/js/main.js`）を含むPRは村上をレビュアーに指定する：
```bash
gh pr create --base develop --reviewer itiwoja ...
```
- CI（PR Check）が red のままではマージしない。落ちた場合は原因を直してから再push。

### 週次統合ルール（develop を常に通しデモ可能に保つ）

背景・通しデモ手順は **[`docs/dev/週次統合ルール_v1.0.md`](docs/dev/週次統合ルール_v1.0.md)** を参照（Issue #110）。

- 毎週金曜を統合日とし、develop で S1→S2→S3→S4 の通しデモを1人が実機で確認する（5分）。手順は `docs/dev/週次統合ルール_v1.0.md`。
- 動かない develop を翌週に持ち越さない（修正を最優先）。
- ロジック実装のPRは「画面から呼ぶ最小結線」まで含める（純粋関数のみの未結線マージ禁止）。
- 確認結果は週次で Issue #110 か Discussions に1行残す。

---

## メンバーと担当

| メンバー | GitHub | 主担当 |
| --- | --- | --- |
| 村上壱基 | `itiwoja` | 基盤アプリ・共有部品・レビュー/マージ |
| 新田漣（れん） | `ren-1222` | SC-01 / SC-02 UI |
| 饒波廣翔（ひろと） | `kuro1020` | 診断 / ロードマップ ロジック |
| 仲程天飛（たかと） | `takato9310` | 推薦ロジック・データ整備 |
| 田島優人（ゆうと） | `yourenputianjian-sketch` | SC-03 / SC-04 UI |

---

## リポジトリの要点

- 実装は `app/`（`index.html` + `css/style.css` + `js/{state,screens,main}.js` + `data/products.js`）。**ビルド不要**、ブラウザで `app/index.html` を開けば動く。
- 仕様・設計は `docs/`（`specs/` 確定仕様、`design/` 詳細設計、`guidelines/` 規約、`dev/` 実装方針、`schedule/` ガント）。
- 設計の正：`docs/specs/基本設計書_v1.0.md`。コード規約：`docs/guidelines/コーディング規約_命名規則_v1.0.md`。
- 近期の主目標：**2026-08-31 に最小機能アプリを Cloudflare Pages で Web公開**（`docs/schedule/ガントチャート_v2.2.md` の M-MVP）。
