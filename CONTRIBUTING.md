# 開発ルール（CONTRIBUTING）

チーム5人で開発を進めるための **共通ルール** です。迷ったらここに戻ってきてください。
ブランチ運用の詳しい解説は [`docs/dev/ブランチ運用ルール_v1.0.md`](docs/dev/ブランチ運用ルール_v1.0.md)（AIエージェント向けの機械可読ルールは [`AGENTS.md`](AGENTS.md)）。

---

## 1. 大原則

- **`main` / `develop` には直接 push しない**（必ずPR経由）
- **新規ブランチは必ず `develop` から切る**（`main` からは切らない）
- **PR の出し先は必ず `develop`**
- **1 ブランチ = 1 機能/タスク = 1 PR**

---

## 2. ブランチ構成

```
main      ← 完成版だけ（さわらない・PRのみ）
  ↑
develop   ← みんなが作業を持ち寄る場所。ここから派生して、ここに戻す
  ↑
feature/sc01-check-ui     ← 機能ごとの作業ブランチ
fix/login-error           ← バグ修正の作業ブランチ
```

### ブランチ命名ルール

- 形式：**`<type>/<kebab-scope>`**（例：`feature/sc01-check-ui`）
- `type` は **`feature` / `fix` / `docs` / `chore` / `refactor`** のどれか。
- 使える文字：**半角の英小文字・数字・ハイフン `-` だけ**。
  - ❌ 日本語・空白・大文字・`_`（アンダースコア）は使わない。
  - ✅ `feature/sc01-check-ui` ／ ❌ `feature/初回チェック` ／ ❌ `Feature/SC01`

### 担当領域と代表ブランチ（目安）

下表は **各メンバーの主担当領域と代表的なブランチ名の例**です。ブランチは「1タスク1ブランチ」で都度作成し、**マージ後は削除**します（固定の常設ブランチではありません）。**いま存在する作業ブランチは GitHub を正**として確認してください。

| メンバー | GitHub | 主担当領域（代表ブランチ例） |
| --- | --- | --- |
| 村上壱基 | `itiwoja` | 基盤・共有部品（`feature/base-*`・`chore/*` 等を都度作成） |
| 新田漣 | `ren-1222` | 初回チェック/ロードマップUI（`feature/sc01-check-ui`・`feature/sc02-roadmap-ui`） |
| 饒波廣翔 | `kuro1020` | 診断/ロードマップ ロジック（`feature/diagnosis-logic`・`feature/roadmap-logic`） |
| 仲程天飛 | `takato9310` | 推薦ロジック・データ整備（`feature/recommend-logic`） |
| 田島優人 | `yourenputianjian-sketch` | 商品比較/継続記録UI（`feature/sc03-product-compare-ui`・`feature/sc04-record-ui`） |

> 新しい種類の作業は `feature/<内容>` で増やしてOK。命名は上の規則（半角英小文字・数字・ハイフンのみ）に従うこと。

---

## 3. 作業の流れ（5ステップ）

### ステップ1：取り組む作業を決める

GitHub の **Issues / Projects（かんばん）** から自分のタスクを選びます。

### ステップ2：develop からブランチを切る

```bash
# develop に移動して最新を取得
git switch develop
git pull

# develop から派生してブランチを切る
git switch -c feature/sc01-check-ui
```

### ステップ3：コードを書いてコミット

```bash
git status              # 変更内容を確認
git add .               # 変更をステージ
git commit -m "feat: 初回チェックの選択肢を追加"
```

### ステップ4：push する

```bash
git push -u origin feature/sc01-check-ui
```

> `-u origin <ブランチ名>` は最初の1回だけ。2回目以降は `git push` だけでOK。

### ステップ5：Pull Request を出す → `develop` に向ける

```bash
gh pr create --base develop --title "feat: 初回チェックUI" --body "やったこと: ..."
```

または GitHub の「Compare & pull request」から。**base が `develop` になっているか必ず確認**（`main` ではない）。

---

## 4. コミットメッセージのルール

先頭に **プレフィックス**（`<type>: <要約>`）を付けます。

| プレフィックス | 使うとき | 例 |
|---|---|---|
| `feat:` | 新しい機能を追加 | `feat: ログイン画面を追加` |
| `fix:` | バグを直した | `fix: パスワードが保存されない不具合を修正` |
| `docs:` | ドキュメントの修正 | `docs: README にセットアップ手順を追記` |
| `refactor:` | 整理（挙動は変えない） | `refactor: state.js を分割` |
| `chore:` | それ以外（設定・ファイル整理） | `chore: .gitignore を更新` |

> 関連 Issue があれば本文や末尾に `#12` の形で書くと紐づきます（任意）。

---

## 5. Pull Request のルール

- **必ず `develop` 向けに出す**（main ではない）
- タイトルはコミットメッセージと同じ形式でOK
- テンプレに沿って **概要・変更点・動作確認** を書く
- レビューを受けてからマージ（**基盤・共有ファイルは村上がマージ**）
- 巨大すぎるPR（1000行超）は避け、なるべく細かく分ける

> 共有ファイル（`app/css/style.css`・`app/js/state.js`・`app/js/main.js`）を大きく変えたいときは、村上に相談してください（基盤は村上が一次管理）。

---

## 6. やってはいけないこと

- ❌ `main` / `develop` への直接 push
- ❌ `main` からのブランチ作成
- ❌ 他人のブランチへの push
- ❌ `git push --force`（過去の履歴を壊す）
- ❌ パスワード・APIキー・`.env` ファイルのコミット
- ❌ ブランチ名に日本語・空白・大文字・`_` を使う

---

## 7. よく使う Git コマンドまとめ

```bash
git status                       # 今の状態を確認
git branch                       # どのブランチにいるか確認

git switch develop && git pull   # 最新の develop を取り込む

# 自分のブランチに develop の最新を取り込む（コンフリクト防止）
git switch feature/sc01-check-ui
git merge develop

git log --oneline                # コミット履歴を見る
```

---

## 困ったとき

- コンフリクト（衝突）が起きた → 一人で抱え込まず、Issue にコメント or チームに相談
- コミットを間違えた → push する前なら `git reset --soft HEAD^` で戻せる（push 後は触らない）
- ブランチ名を間違えた → `git branch -m <新しい名前>` で変更できる
