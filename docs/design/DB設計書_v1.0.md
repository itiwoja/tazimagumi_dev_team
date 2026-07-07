# DB設計書 v1.0

**プロジェクト：** 田島組 卒業制作（男の身だしなみアプリ）
**親：** [基本設計書 v1.0 §4](../specs/基本設計書_v1.0.md) ／ **関連：** [商品マスタ設計書](./商品マスタ設計書_v1.0.md)・[データアクセス設計書](../dev/データアクセス設計書_v1.0.md)
**ステータス：** ドラフト

> 基本設計書 §4 の論理モデルを、Supabase（PostgreSQL）のテーブル定義に具体化します。
> **方針：マスター（商品・成分）はSupabaseに置き読み取り中心。ユーザーデータ（診断回答・記録）は端末ローカルに保存しサーバには送らない。**

---

## 1. 全体像（ER図）

> 図式版（mermaid・多重度表）は [ER図 v1.0](./ER図_v1.0.md) を参照。列定義の正本は本書 §2。

```
┌────────────┐      ┌──────────────────────┐      ┌──────────────┐
│ products    │1───∞│ product_ingredients   │∞───1│ ingredients   │
│ (商品)      │      │ (商品×成分・有無)      │      │ (成分)        │
└────────────┘      └──────────────────────┘      └──────────────┘
      │ type_tags[] / category
      ▼（論理的に対応。FKは張らない）
┌──────────────────────┐
│ roadmap_concepts      │  タイプ別の手順（概念）
└──────────────────────┘

［端末ローカル（Supabaseには保存しない）］
 diagnosis_answers / diagnosis_result / continuity_log / prefs
```

---

## 2. テーブル定義（Supabase）

### 2.1 `products` — 商品マスター（MVPの中核・30〜50件）

| 列 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| `id` | text | PK | 一意ID（例：`lotion-basic`） |
| `name` | text | NOT NULL | 商品名 |
| `brand` | text | | ブランド名 |
| `category` | text | NOT NULL | 汚れ落とし／化粧水／乳液／オールインワン 等 |
| `price` | int | NOT NULL, ≥0 | 税込価格（円） |
| `volume` | int | | 容量（mL） |
| `budget_tier` | text | NOT NULL | `core`（〜5,000円）／`sub`（〜1,500円） |
| `type_tags` | text[] | NOT NULL | 対応タイプ（`type1`〜`type6`）。複合対応で複数可 |
| `feel` | text | | 使用感（事実：「さっぱり」等） |
| `scent` | text | | 香り（事実：「無香料」等） |
| `summary_one_liner` | text | | 初心者向け「違いの一言」 |
| `image_url` | text | | 画像URL（任意） |
| `created_at` | timestamptz | default now() | |

### 2.2 `ingredients` — 成分マスター（事実のみ）

| 列 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| `id` | text | PK | 一意ID |
| `name` | text | NOT NULL | 成分名（例：「セラミド」） |
| `fact_tag` | text | | 56効能の範囲内の事実タグ（例：「うるおいを与える」） |
| `note` | text | | 補足 |

> **安全性・刺激の独自評価は持たせない**（薬機法準拠：[薬機法準拠ガイドライン](../guidelines/薬機法準拠ガイドライン_v1.0.md)）。

### 2.3 `product_ingredients` — 商品×成分（中間テーブル）

| 列 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| `product_id` | text | FK→products.id | |
| `ingredient_id` | text | FK→ingredients.id | |
| `present` | bool | NOT NULL default true | 配合の「有無」という事実 |
| | | PK(`product_id`,`ingredient_id`) | 複合主キー |

### 2.4 `roadmap_concepts` — タイプ別ロードマップの概念ステップ

| 列 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| `id` | text | PK | |
| `type` | text | NOT NULL | `type1`〜`type6` |
| `step_order` | int | NOT NULL | 表示順 |
| `concept_label` | text | NOT NULL | 「汚れ落とし」「化粧水」「乳液」等 |
| `timing` | text | NOT NULL | `today`／`tonight`／`morning` |

---

## 3. 端末ローカル保存（IndexedDB / localStorage）

| キー | 内容 | 媒体 |
| --- | --- | --- |
| `diagnosis_answers` | 初回チェックの回答 | IndexedDB |
| `diagnosis_result` | `{ primaryType, secondaryType, isComposite, scores, topContributors }` | IndexedDB |
| `continuity_log` | 週次自己評価の履歴 | IndexedDB |
| `prefs` | 文字大きめモード等のUI設定 | localStorage |

詳細は [認証・データ保存方針書](../dev/認証・データ保存方針書_v1.0.md) を正とする。

---

## 4. RLS（行レベルセキュリティ）方針

| テーブル | SELECT | INSERT/UPDATE/DELETE |
| --- | --- | --- |
| products / ingredients / product_ingredients / roadmap_concepts | **公開（anon可）** | 管理者（チーム運用）のみ |

- ユーザー由来データはサーバに置かないため、ユーザー単位のRLSはMVPでは不要。
- 書き込みはSupabaseダッシュボード／管理用キーから行い、`anon` キーには付与しない。

---

## 5. 改訂履歴

| 日付 | 版 | 変更点 |
| --- | --- | --- |
| 2026/06/26 | v1.0 | 初版。基本設計書 §4 を4テーブル＋ローカル保存に具体化 |
