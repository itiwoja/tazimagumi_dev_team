# tazimagumi_dev_team

田島組 卒業制作。男性5人チームで **男の身だしなみ（日常スキンケア）アプリ** を開発するリポジトリです。
**まずバニラJSでMVPを完成させ、時間があれば別スタックへ移行**する方針です。

---

## 技術スタック

| レイヤ | 採用技術 |
|---|---|
| フロント | **HTML + CSS + バニラJS**（`app/` 配下・**ビルド不要**） |
| データ | ローカルの商品マスタ（`app/data/products.js`） |
| BaaS / DB | Supabase（Postgres / Auth）※**将来拡張**。MVPはローカルのみ |
| デプロイ | Cloudflare Pages（GitHub Actions + Wrangler） |
| バージョン管理 | Git / GitHub |
| タスク管理 | GitHub Issues + Projects（かんばん） |

> 設計の正は [`docs/specs/基本設計書_v1.0.md`](docs/specs/基本設計書_v1.0.md)。スタック移行方針は同書 §2.4。

---

## ディレクトリ構成

```
tazimagumi_dev_team/
├── app/             実装本体（ビルド不要・ブラウザで開けば動く）
│   ├── index.html       エントリ
│   ├── css/style.css    スタイル
│   ├── js/              state.js / screens.js / main.js
│   └── data/products.js 商品マスタ（ダミー）
├── docs/            設計書・ガイドライン・スケジュール（詳細は docs/README.md）
├── mockup/          発表用の静的HTMLモックアップ
├── .github/         Issue / PR テンプレ
├── AGENTS.md        AIエージェント＆共通の作業ルール（ブランチ運用）
├── CLAUDE.md        AGENTS.md と同内容
├── CONTRIBUTING.md  開発ルール（必読）
└── README.md        このファイル
```

---

## 動かし方

ビルドは不要です。クローンして **`app/index.html` をブラウザで開くだけ**で動きます。

```bash
git clone https://github.com/itiwoja/tazimagumi_dev_team.git
cd tazimagumi_dev_team
# app/index.html をダブルクリック（またはブラウザにドラッグ）
```

## Cloudflare Pagesへの公開

公開は `develop` で通しデモ・CI確認後に `main` 向けリリースPRをマージするか、`main` refで `deploy-pages.yml` を手動実行して行います。初回だけ、管理者が次を設定してください。

1. Cloudflare PagesでDirect Uploadのプロジェクトを作成し、初回作成時にproduction branchを `main` に指定する。既存のDirect UploadプロジェクトはDashboardからproduction branch controlsを変更できないため、Cloudflare APIのUpdate Project endpointを一度実行して `main` に更新する
   ```bash
   curl --request PATCH \
     "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/pages/projects/<PROJECT_NAME>" \
     --header "Authorization: Bearer <API_TOKEN>" \
     --header "Content-Type: application/json" \
     --data '{"production_branch":"main"}'
   ```
2. GitHubリポジトリの Settings → Secrets and variables → Actions → Secrets に次を登録する
   - `CLOUDFLARE_API_TOKEN`（Cloudflare PagesのEdit権限を持つAPI token）
   - `CLOUDFLARE_ACCOUNT_ID`
3. 同じ画面の Variables に `CLOUDFLARE_PAGES_PROJECT_NAME`（Pagesプロジェクト名）を登録する
4. `develop` で確認済みの変更を `main` 向けリリースPRとしてマージする（`main` への直接pushは保護ルールで行わない）か、Actionsから `main` refを選んで `Deploy to Cloudflare Pages` を手動実行する

API tokenやAccount IDの実値はリポジトリへ保存しません。

---

## 開発の流れ

1. 取り組む作業を **GitHub Issues / Projects（かんばん）** から選ぶ
2. **`develop` から**ブランチを切る（命名は `<type>/<kebab-scope>`）
3. コードを書いてコミット（`<type>: <要約>`）
4. push して **`develop` 向けにPR** → レビュー後マージ

> 詳しい手順とブランチ名・担当の一覧は
> [`CONTRIBUTING.md`](CONTRIBUTING.md) ／ [`docs/dev/ブランチ運用ルール_v1.0.md`](docs/dev/ブランチ運用ルール_v1.0.md) ／ [`AGENTS.md`](AGENTS.md) を参照。

---

## 直近の目標

- **2026-08-31 に最小機能アプリを Cloudflare Pages で Web公開**（[`docs/schedule/ガントチャート_v2.2.md`](docs/schedule/ガントチャート_v2.2.md) の M-MVP）。
- まず村上が基盤を先行構築（M-Base）→ 各機能を feature ブランチで分担。

---

## やってはいけないこと

- ❌ `main` / `develop` へ直接 push（必ずPR経由）
- ❌ `main` からブランチを切る（`develop` から切る）
- ❌ `git push --force`（履歴を壊す）
- ❌ `.env` などパスワード・APIキーのコミット

困ったときは Issue にコメントするか、チームに聞いてください。
