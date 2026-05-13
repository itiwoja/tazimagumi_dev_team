# データモデル（PostgreSQL）

> 企画書 v3.0 §9 で採用が決まった PostgreSQL のスキーマ設計。
> Spring Boot エンティティ層の元になる。マイグレーションは Flyway を想定。
>
> 命名規則: テーブル名は snake_case 複数形、列名は snake_case。
> 日時は全て `TIMESTAMPTZ`（UTC 保存、JST 表示はアプリ層）。

## ER 概要

```
skin_types ──< products_skin_types >── products ──< product_shave_irritants >── shave_irritants
                                          │
                                          ├── product_ingredient_tags ── ingredient_tags
                                          └── shave_care_scores

diagnosis_sessions ──< diagnosis_answers >── diagnosis_questions ──< diagnosis_choices >──
                                                                          │
                                                                          └── choice_type_scores
diagnosis_sessions ──1:1── diagnosis_results

community_posts (将来 / §8.2 ⑧)
care_records  (将来 / §8.2 ⑦)
achievements  (将来 / §8.2 ⑦)
```

## マスター系（不変寄り）

### `skin_types`

| 列 | 型 | 制約 | 備考 |
|----|----|------|------|
| `id` | TEXT | PK | `oily / dry / shave-care / pores / age-care / beginner` |
| `name` | TEXT | NOT NULL | 表示名 |
| `headline` | TEXT | NOT NULL | カードのコピー |
| `accent_color` | TEXT | NOT NULL | `#RRGGBB` |
| `recommend_set_name` | TEXT | NOT NULL | |
| `age_hint` | TEXT | | 想定年齢帯 |

### `ingredient_tags`

化粧品 56 効能の範囲内で表示できるタグ。

| 列 | 型 | 制約 |
|----|----|------|
| `id` | TEXT | PK |
| `label` | TEXT | NOT NULL |
| `allowed_for_general_cosmetics` | BOOLEAN | NOT NULL DEFAULT TRUE |
| `allowed_for_medicinal_only` | BOOLEAN | NOT NULL DEFAULT FALSE |

### `shave_irritants`

| 列 | 型 | 制約 |
|----|----|------|
| `id` | TEXT | PK |
| `display_name` | TEXT | NOT NULL |
| `severity` | TEXT | NOT NULL CHECK (severity IN ('mild','moderate','strong')) |
| `alternative_hint` | TEXT | |

### `products`

| 列 | 型 | 制約 |
|----|----|------|
| `id` | TEXT | PK |
| `name` | TEXT | NOT NULL |
| `brand` | TEXT | NOT NULL |
| `price_jpy` | INTEGER | NOT NULL CHECK (price_jpy >= 0) |
| `price_tier` | TEXT | NOT NULL CHECK (price_tier IN ('trial','standard','premium')) |
| `category` | TEXT | NOT NULL CHECK (category IN ('cleanser','lotion','moisturizer','after-shave','sunscreen','all-in-one')) |
| `image_url` | TEXT | |
| `is_medicinal` | BOOLEAN | NOT NULL |
| `rakuten_item_url` | TEXT | |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

インデックス: `(category, price_tier)`, `(brand)`

### `products_skin_types`（多対多: どのタイプに推薦するか）

| 列 | 型 | 制約 |
|----|----|------|
| `product_id` | TEXT | FK → products(id) ON DELETE CASCADE |
| `skin_type_id` | TEXT | FK → skin_types(id) |
| `priority` | INTEGER | NOT NULL DEFAULT 0 |
| PK | | `(product_id, skin_type_id)` |

### `product_ingredient_tags`

| 列 | 型 |
|----|----|
| `product_id` | TEXT, FK → products(id) ON DELETE CASCADE |
| `ingredient_tag_id` | TEXT, FK → ingredient_tags(id) |
| PK | `(product_id, ingredient_tag_id)` |

### `product_shave_irritants`

| 列 | 型 |
|----|----|
| `product_id` | TEXT, FK → products(id) ON DELETE CASCADE |
| `irritant_id` | TEXT, FK → shave_irritants(id) |
| PK | `(product_id, irritant_id)` |

### `shave_care_scores`

| 列 | 型 |
|----|----|
| `product_id` | TEXT, PK, FK → products(id) ON DELETE CASCADE |
| `moisture` | SMALLINT NOT NULL CHECK (moisture BETWEEN 1 AND 5) |
| `low_irritation` | SMALLINT NOT NULL CHECK (low_irritation BETWEEN 1 AND 5) |
| `glide` | SMALLINT NOT NULL CHECK (glide BETWEEN 1 AND 5) |
| `feel` | SMALLINT NOT NULL CHECK (feel BETWEEN 1 AND 5) |
| `after_care` | SMALLINT NOT NULL CHECK (after_care BETWEEN 1 AND 5) |

### `diagnosis_questions` / `diagnosis_choices` / `choice_type_scores`

```
diagnosis_questions(
  id TEXT PK,
  section_no INT NOT NULL,
  question_no_in_section INT NOT NULL,
  section_title TEXT NOT NULL,
  text TEXT NOT NULL,
  help_text TEXT,
  is_multi_select BOOLEAN NOT NULL
)

diagnosis_choices(
  id TEXT PK,
  question_id TEXT NOT NULL FK → diagnosis_questions(id),
  label TEXT NOT NULL,
  display_order INT NOT NULL
)

choice_type_scores(
  choice_id TEXT FK → diagnosis_choices(id) ON DELETE CASCADE,
  skin_type_id TEXT FK → skin_types(id),
  weight INT NOT NULL,
  PRIMARY KEY (choice_id, skin_type_id)
)

choice_concern_tags(
  choice_id TEXT FK → diagnosis_choices(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (choice_id, tag)
)
```

## トランザクション系

### `diagnosis_sessions`

| 列 | 型 | 制約 |
|----|----|------|
| `id` | UUID | PK DEFAULT gen_random_uuid() |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `evaluated_at` | TIMESTAMPTZ | |
| `client_fingerprint` | TEXT | | PII 回避、UA ハッシュなどでスパム抑制のみに使用 |

### `diagnosis_answers`

| 列 | 型 |
|----|----|
| `session_id` | UUID, FK → diagnosis_sessions(id) ON DELETE CASCADE |
| `question_id` | TEXT, FK → diagnosis_questions(id) |
| `choice_id` | TEXT, FK → diagnosis_choices(id) |
| PK | `(session_id, question_id, choice_id)` |
| `answered_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() |

複数選択の場合、行が複数入る。

### `diagnosis_results`

| 列 | 型 |
|----|----|
| `session_id` | UUID PK FK → diagnosis_sessions(id) |
| `skin_type_id` | TEXT FK → skin_types(id) |
| `shave_burden_level` | TEXT NOT NULL CHECK (shave_burden_level IN ('low','mid','high')) |
| `scores_by_type` | JSONB NOT NULL |
| `concern_tags` | TEXT[] NOT NULL DEFAULT '{}' |
| `budget_tag` | TEXT |
| `completed_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() |

## 将来テーブル（拡張フェーズ）

`care_records` / `achievements` / `user_profiles` / `community_posts` は
企画書 §8.2 ⑦⑧ の実装着手時に DDL を追加する。

### `user_profiles`（拡張）

```
id UUID PK
nickname TEXT
current_skin_type_id TEXT FK
streak_days INT NOT NULL DEFAULT 0
last_diagnosis_at TIMESTAMPTZ
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### `community_posts`（拡張、学内クローズド）

```
id UUID PK
author_profile_id UUID FK → user_profiles(id)
category TEXT CHECK (category IN ('question','feel','compare','chat'))
title TEXT NOT NULL
body TEXT NOT NULL
moderation_status TEXT NOT NULL CHECK (moderation_status IN ('pending','approved','blocked'))
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

## マイグレーション運用

- v0.1 (MVP): `skin_types` / `ingredient_tags` / `shave_irritants` / `products` 系 / `diagnosis_*`
- v0.2 (拡張): `user_profiles` / `care_records` / `achievements`
- v0.3 (拡張): `community_posts` / モデレーション関連

シード投入は `db/seed/*.sql` を Flyway の `R__` リピータブルとして配置し、
`mock-data/*.json` をビルド時に SQL に変換する仕組みを別途検討。
