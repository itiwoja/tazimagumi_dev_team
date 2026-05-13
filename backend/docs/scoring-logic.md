# 診断スコアリング・ロジック設計書

> 企画書 v3.0 §8.1 ②「別紙『診断ロジック設計書』と同時に着手」の実体。
> 23問の回答から 6 タイプ（`oily / dry / shave-care / pores / age-care / beginner`）を判定し、
> 悩みタグ・髭剃り負担レベル・予算帯を確定する。

## 1. 入力と出力

### 入力

| 項目 | 型 | 由来 |
|------|---|------|
| `answers` | `DiagnosisAnswer[]` | `PUT /diagnosis/sessions/{id}/answers` の保存内容 |
| `questions` | `DiagnosisQuestion[]` | `mock-data/diagnosis-questions.json` のマスター |

### 出力（`DiagnosisResult`）

| フィールド | 決定方法 |
|-----------|---------|
| `skinTypeId` | スコア最大の `SkinType.id` |
| `scoresByType` | 6タイプの集計スコア辞書 |
| `concernTags` | `Choice.concernTags` をユニーク化したタグ配列（`budget:*` は除外） |
| `shaveBurdenLevel` | `shave-care` スコアと特定の回答から算出 |
| `recommendations` | `RecommendationBundle`（後述） |
| `routine` | `mock-data/routines.json` から `skinTypeId` で引く |
| `completedAt` | サーバ時刻（ISO 8601） |

## 2. スコア集計アルゴリズム

```
function evaluate(answers, questions):
    scoreByType = {oily:0, dry:0, "shave-care":0, pores:0, "age-care":0, beginner:0}
    concernTags = empty set
    budgetTag = "budget:3000"  # デフォルト

    for ans in answers:
        question = lookup(questions, ans.questionId)
        for choiceId in ans.selectedChoiceIds:
            choice = lookup(question.choices, choiceId)
            for typeId, weight in choice.scoreByType.items():
                scoreByType[typeId] += weight
            for tag in choice.concernTags or []:
                if tag startsWith "budget:":
                    budgetTag = tag
                else:
                    concernTags.add(tag)

    skinTypeId = argmax(scoreByType)
    # 同点なら 6タイプ宣言順（oily → dry → shave-care → pores → age-care → beginner）の先頭を選ぶ
    return {
        skinTypeId,
        scoresByType: scoreByType,
        concernTags: list(concernTags),
        shaveBurdenLevel: deriveShaveBurden(scoreByType, concernTags),
        budgetTag,
        ...
    }
```

## 3. shaveBurdenLevel の決定ルール

| 条件 | shaveBurdenLevel |
|------|-----------------|
| `shave-care` スコア ≥ 8 または `q03-a (毎日剃る)` + `q13-c (赤みが翌日まで残る)` | `high` |
| `shave-care` スコア 4〜7 | `mid` |
| それ以下、または `q03-d (ほぼ剃らない)` | `low` |

`shaveBurdenLevel = high` の場合、判定タイプが `oily/dry/age-care/pores/beginner` であっても、
推薦のスロット構成に `after-shave` を必ず加える（ハイブリッド推薦）。

## 4. RecommendationBundle の組み立て

1. `slotKeysFor(skinTypeId, shaveBurdenLevel)` で必要スロットを決定:
   - `oily` → `cleanser, lotion, moisturizer`
   - `dry` → `cleanser, lotion, moisturizer`
   - `shave-care` → `cleanser, after-shave, moisturizer`
   - `pores` → `cleanser, lotion, moisturizer`
   - `age-care` → `cleanser, lotion, moisturizer, sunscreen`
   - `beginner` → `cleanser, all-in-one`
   - shaveBurdenLevel が `high` → 上記に `after-shave` を追加
2. 各スロットについて、`products.json` から `category === slotKey` の3価格帯 (`trial/standard/premium`) を1件ずつ選ぶ:
   - 並び順: `priceJPY` 昇順
   - `budgetTag` が `budget:3000` のときは `premium` を除外
3. `lineUseMode=true` の場合は、最も多くのスロットを満たすブランドを1つ選び、そのブランドだけで揃える。
   満たせないスロットは、最も近い価格帯の別ブランドで穴埋め。
4. 各 `RecommendationCandidate.reason` は `mock-data/recommendation-templates.json` のテンプレを以下の優先度で選ぶ:
   1. `targetSkinTypes` に `skinTypeId` を含むテンプレ
   2. `type === "shave-care"` かつ `slotKey === "after-shave"`
   3. `type === "line-use"` かつ `lineUseMode === true`
   4. `type === "general"` のデフォルト
5. テンプレ内のプレースホルダ (`{skinTypeName}`, `{brand}`, `{budgetLabel}`) は決定論的に置換。
   LLM を用いて自由に文章を生成することは **しない**（薬機法リスク回避、企画書 §10.2）。

## 5. 同点処理・エッジケース

| ケース | 扱い |
|--------|------|
| すべての回答がデフォルト (0点) | `beginner` を返す |
| 23 問のうち未回答が 1問以上 | `422 Unprocessable Entity` を返す（必須回答不足） |
| `q02-b (回答しない)` のみ | 推薦精度低下の警告フラグ `lowConfidence=true` を `concernTags` に追加 |
| `concernTags` が 5 タグ超 | 上位 5 件（出現スコア順）に圧縮して返す |

## 6. テスト戦略

| 観点 | 期待動作 |
|------|---------|
| 全質問で `dry` 寄り回答 | `skinTypeId === "dry"` |
| `q03-a` + `q13-a` + `q15-a` | `shaveBurdenLevel === "high"` |
| `q21-a` + `q22-a` + その他 0 点回答 | `skinTypeId === "beginner"` |
| `q23-a (〜3000円)` 選択 | 推薦から `premium` 価格帯が消える |
| `lineUseMode=true` | 推薦の `brand` が最大 1 または 2 種類に収束 |

実装は `DiagnosisService` のユニットテスト（JUnit 5）で全パターン網羅すること。

## 7. 未確定項目

- 同点処理の宣言順序は v0.1 で固定だが、ユーザーテスト 5〜10 件後に「複数タイプ提示」へ拡張する可能性あり（企画書 §7.3）。
- 沖縄の高湿度・強紫外線を考慮した補正（企画書 §1）は v0.2 以降の検討事項。
