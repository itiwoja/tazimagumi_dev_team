# backend

田島組 卒業制作アプリ「男のスキンケア、最初の1本を選ぶアプリ」（企画書 v3.0）のバックエンドレーン。

実装言語: **Java 21 + Spring Boot**（コード本体は別タスクで着手）
データベース: **PostgreSQL**
外部 API: 楽天市場 API 新版 (openapi.rakuten.co.jp) — 2026/05/13 以降の新認証方式

## 現状（v0.1.0-mock）

Spring Boot プロジェクト本体は未着手。
**API 契約とモックデータが先に固まっている** ので、frontend レーンはこれを参照して
モック実装を進められる。

```
backend/
├── README.md                    ← この文書（インデックス）
├── api/
│   └── openapi.yaml             ← REST API 仕様 (OpenAPI 3.0)
├── docs/
│   ├── data-model.md            ← PostgreSQL スキーマ設計
│   └── scoring-logic.md         ← 23問→6タイプ判定アルゴリズム
└── mock-data/
    ├── skin-types.json              ← 6タイプ TOP のカードデータ
    ├── diagnosis-questions.json     ← 23問の質問と選択肢スコア
    ├── products.json                ← 商品マスター（ダミー14件）
    ├── shave-irritants.json         ← 髭剃り直後刺激成分マスター
    ├── recommendation-templates.json← 推薦理由テンプレ（薬機法準拠）
    └── routines.json                ← 6タイプ別 朝・夜ステップ
```

## frontend レーンへの提供物

| 必要なもの | 参照先 |
|----------|--------|
| 6タイプ TOP カードの内容 | `mock-data/skin-types.json` |
| 23問の質問・選択肢・スコア | `mock-data/diagnosis-questions.json` |
| 商品データ（推薦表示用） | `mock-data/products.json` |
| 朝・夜ルーティン | `mock-data/routines.json` |
| 髭剃りケアの刺激成分タグ | `mock-data/shave-irritants.json` |
| API エンドポイント仕様 | `api/openapi.yaml` |
| TypeScript 型生成 | `openapi-typescript` などで `api/openapi.yaml` から自動生成可能 |

バックエンド未起動時は、frontend レーン側で `mock-data/*.json` を fetch してそのまま使うことを想定（ローカルファイルか、ライト Express ミドルウェアでサーブ）。
契約は `openapi.yaml` で固定されているので、後で Spring Boot 実装に差し替えても URL とレスポンス構造は変わらない。

## エンドポイント早見表

| メソッド | パス | 役割 | MVP/拡張 |
|---------|------|------|---------|
| GET | `/api/v1/skin-types` | 6タイプ一覧 | MVP |
| GET | `/api/v1/skin-types/{typeId}` | タイプ詳細 | MVP |
| GET | `/api/v1/diagnosis/questions` | 23問取得 | MVP |
| POST | `/api/v1/diagnosis/sessions` | 診断セッション開始 | MVP |
| PUT | `/api/v1/diagnosis/sessions/{id}/answers` | 回答保存 | MVP |
| POST | `/api/v1/diagnosis/sessions/{id}/evaluate` | 判定実行 | MVP |
| GET | `/api/v1/recommendations/by-type/{typeId}` | 即決導線の推薦 | MVP |
| GET | `/api/v1/products` | 商品一覧 | MVP |
| GET | `/api/v1/products/{productId}` | 商品詳細 | MVP |
| GET | `/api/v1/routines/by-type/{typeId}` | タイプ別ルーティン | MVP |
| GET | `/api/v1/shave-care/ingredients` | 髭剃り刺激成分マスター | MVP |
| GET | `/api/v1/shave-care/score/{productId}` | 刺激配慮スコア（5指標） | MVP |

## 薬機法ガードレール（必読）

企画書 §10 に従い、本バックエンドは以下を遵守する。
**この方針はコードレビューで必ず確認すること。**

- 推薦理由文は `recommendation-templates.json` のテンプレを **決定論的に** 埋めて生成。
  LLM による自由生成は行わない。
- 「治る／効く／消える／必ず合う／No.1」などの NG 表現は出力ペイロードに存在しない（API テストで検証）。
- 一般化粧品と医薬部外品 (`Product.isMedicinal`) で表示できるタグを分岐する。
- 効能タグマスター (`ingredient_tags`) は化粧品 56 効能の範囲内に限定。
- コミュニティ投稿（拡張フェーズ §8.2 ⑧）は OpenAI Moderation API + NG ワードフィルタ + 投稿前 hold で運用。

## 開発・実装ロードマップ

| フェーズ | 主担当 | 概要 |
|---------|--------|------|
| v0.1.0-mock | (この PR) | OpenAPI 仕様・モック JSON・スキーマ設計の確定 |
| v0.2 | ひろと（企画書 §11） | Spring Boot 雛形、`/skin-types` `/products` 静的 endpoint |
| v0.3 | ひろと | `/diagnosis/*` 動的 endpoint・スコアリング実装 (`DiagnosisService`) |
| v0.4 | ひろと + たかと | PostgreSQL + Flyway マイグレーション・本物のシード |
| v0.5 | ひろと + ゆうと | 楽天市場 API 新版連携、`/shave-care/*` |
| v1.0 | チーム | 学内クローズドコミュニティ（拡張） |

## ローカル動作（実装着手後）

```bash
# Spring Boot 起動（実装着手後）
./mvnw spring-boot:run

# OpenAPI 仕様の確認
open http://localhost:8080/swagger-ui.html
```

## 注意

このレーンが触ってよいのは `backend/` 配下のみ。
ルート設定 (`package.json`, `tsconfig.json`, `.gitignore`) は統合ワークスペースが管理する
（`../CLAUDE.md` 参照）。
