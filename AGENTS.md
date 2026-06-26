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
- 基盤・共有ファイル（`app/css/style.css`・`app/js/state.js`・`app/js/main.js`）は **村上（itiwoja）が一次管理**。大きな変更は要相談。
- コミットは **`<type>: <要約>`**（`feat|fix|docs|refactor|test|chore`）。

### 標準フロー
```bash
git switch develop && git pull
git switch -c feature/<scope>
# 実装 → コミット
git add . && git commit -m "feat: <要約>"
git push -u origin feature/<scope>
gh pr create --base develop
# レビュー後マージ → ブランチ削除 → 各自 develop を pull
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
    - git switch -c <type>/<scope>
    - implement + commit (commit.format)
    - git push -u origin <type>/<scope>
    - gh pr create --base develop
    - merge after review, delete branch, others pull develop
  forbidden:
    - direct push to main or develop
    - creating branches from main
    - multiple features in one branch
    - non-ascii / whitespace / uppercase / underscore in branch name
```

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
- 近期の主目標：**2026-08-31 に最小機能アプリを GitHub Pages で Web公開**（`docs/schedule/ガントチャート_v2.0.md` の M-MVP）。
