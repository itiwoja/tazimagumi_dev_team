# tazimagumi_dev_team

a
学校の卒業制作リポジトリ。男性5人チームで、**美容（男性向け日常スキンケア管理）** をテーマにしたWebアプリを開発します。

---

## 技術スタック

| レイヤ | 採用技術 |
|---|---|
| フロントエンド | React (Vite + TypeScript) + UIライブラリ |
| バックエンド | Java + Spring Boot |
| データベース | 後日確定（MySQL or PostgreSQL） |
| AI/データ処理 | Python（必要になったら追加） |
| デプロイ | AWS（将来） |
| バージョン管理 | Git / GitHub |
| タスク管理 | GitHub Issue |

---

## ディレクトリ構成

```
tazimagumi_dev_team/
├── .github/         GitHub の Issue / PR テンプレ
├── frontend/        React のプロジェクト（後で配置）
├── backend/         Spring Boot のプロジェクト（後で配置）
├── docs/            設計書・議事録・ヒアリング記録
├── .gitignore       Git で管理しないファイルの一覧
├── README.md        このファイル
└── CONTRIBUTING.md  開発ルール（必読）
```

---

## 初回セットアップ手順

開発を始める前に、各自のPCで以下を1回だけ実行します。

### 1. リポジトリをクローン

```bash
git clone https://github.com/<オーナー名>/tazimagumi_dev_team.git
cd tazimagumi_dev_team
```

### 2. develop ブランチに切り替え

```bash
git fetch origin
git checkout develop
```

> ※ `main` は本番用なので、普段は触りません。作業はすべて `develop` から派生させます。

### 3. 最新の状態に更新

```bash
git pull
```

これで準備完了です。

---

## 開発の流れ

すべての作業は **GitHub Issue** から始めます。詳細は [CONTRIBUTING.md](./CONTRIBUTING.md) を必ず読んでください。

ざっくり5ステップ:

1. GitHub で **Issue を作る**（やりたいこと/直したいことを書く）
2. **ブランチを切る**（`feature/<Issue番号>-<短い説明>`）
3. **コード書いてコミット**
4. **push する**
5. **Pull Request（PR）を `develop` 向けに出す** → 他のメンバーがレビュー → マージ

---

## やってはいけないこと

- ❌ `main` ブランチに直接 push する（保護ルールで弾かれます）
- ❌ 他の人が作業中のブランチに push する
- ❌ `git push --force`（過去のコミット履歴を壊す危険な操作）
- ❌ `.env` などのパスワード・APIキーを含むファイルをコミットする

困ったときは Issue にコメントするか、チームに聞いてください。
