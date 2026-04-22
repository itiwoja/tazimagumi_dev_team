# 開発ルール（CONTRIBUTING）

このファイルはチーム5人で開発を進めるための **共通ルール** です。最初は読みづらいかもしれませんが、迷ったらここに戻ってきてください。

---

## 1. 大原則

- **作業の起点は必ず GitHub Issue**
- **`main` には直接 push しない**（保護ルールで弾かれます）
- **PR の出し先は必ず `develop`**
- **1 つの Issue = 1 つのブランチ = 1 つの PR**

---

## 2. ブランチ構成

```
main      ← 本番用。リリースしたい時だけ develop からマージする
  ↑
develop   ← みんなが作業を持ち寄る場所。ここから派生して、ここに戻す
  ↑
feature/12-add-search   ← 機能追加するときに切るブランチ
fix/15-login-error      ← バグ修正するときに切るブランチ
```

### ブランチ命名ルール

- 機能追加: `feature/<Issue番号>-<英語の短い説明>`
  - 例: `feature/12-add-search`、`feature/20-user-profile`
- バグ修正: `fix/<Issue番号>-<英語の短い説明>`
  - 例: `fix/15-login-error`

英語が思いつかないときは Google 翻訳でOKです。長くしすぎず、3〜4単語程度で。

---

## 3. 作業の流れ（5ステップ）

### ステップ1：GitHub で Issue を作る

GitHub 上で「Issues」タブ → 「New issue」 → テンプレを選ぶ（Bug Report / Feature Request）。

書いたら **Issue 番号（#12 など）** をメモしておきます。

### ステップ2：ブランチを切る

ターミナルで以下を実行（Issue番号が `12`、検索機能を追加する例）:

```bash
# develop に移動して最新を取得
git checkout develop
git pull

# develop から派生してブランチを切る
git checkout -b feature/12-add-search
```

### ステップ3：コードを書いてコミット

ファイルを編集したあと:

```bash
# 変更内容を確認
git status

# 変更を全部ステージ
git add .

# コミット（メッセージの先頭にプレフィックス、末尾に Issue 番号）
git commit -m "feat: 検索機能を追加 #12"
```

### ステップ4：push する

```bash
git push -u origin feature/12-add-search
```

> `-u origin <ブランチ名>` は最初の1回だけ必要。2回目以降は `git push` だけでOK。

### ステップ5：Pull Request を出す

1. GitHub に行く → 「Pull requests」タブ → 「New pull request」
2. **base: `develop` ← compare: `feature/12-add-search`** を選ぶ
3. PR テンプレが自動で出てくるので埋める
4. 他のメンバーにレビュー依頼
5. 承認されたら **マージ**（GitHub 上のボタンを押す）

---

## 4. コミットメッセージのルール

先頭に **プレフィックス** を付けてください。最低限の4種だけ覚えればOK。

| プレフィックス | 使うとき | 例 |
|---|---|---|
| `feat:` | 新しい機能を追加 | `feat: ログイン画面を追加 #5` |
| `fix:` | バグを直した | `fix: パスワードが保存されない不具合を修正 #15` |
| `docs:` | ドキュメントの修正 | `docs: README にセットアップ手順を追記 #8` |
| `chore:` | それ以外（設定変更、ファイル整理など） | `chore: .gitignore を更新 #3` |

末尾には関連 Issue 番号を `#12` の形式で書く。

---

## 5. Pull Request のルール

- **必ず `develop` 向けに出す**（main ではない）
- タイトルはコミットメッセージと同じ形式でOK
- テンプレに沿って **関連Issue・概要・動作確認** を書く
- マージは **他のメンバーが1人以上 Approve してから**
- 自分の PR を自分でマージしない（必ずレビュー後）

---

## 6. やってはいけないこと

- ❌ `main` への直接 push
- ❌ 他人のブランチへの push
- ❌ `git push --force`（過去の履歴を壊します）
- ❌ パスワード、APIキー、`.env` ファイルをコミット
- ❌ 巨大すぎる PR（1000行超えるレベル） → なるべく細かく分ける

---

## 7. よく使う Git コマンドまとめ

```bash
# 今の状態を確認
git status

# どのブランチにいるか確認
git branch

# 最新の develop を取り込む
git checkout develop
git pull

# 自分のブランチに develop の最新を取り込む（コンフリクト防止）
git checkout feature/12-add-search
git merge develop

# コミットの履歴を見る
git log --oneline
```

---

## 困ったとき

- コンフリクト（衝突）が起きた → 一人で抱え込まず、Issue にコメント or チームに相談
- コミットを間違えた → push する前なら `git reset --soft HEAD^` で戻せる（push 後は触らない）
- ブランチ名を間違えた → `git branch -m <新しい名前>` で変更できる
