#!/usr/bin/env node
/* =====================================================================
   商品データ検証スクリプト（Issue #73 / 提案-M1）
   ---------------------------------------------------------------------
   app/data/products.js の必須項目チェックと、薬機法上の禁止表現の
   機械的検出を行う。違反があれば一覧を出力して非0終了する。
   CI（#81 / 提案-Z2）から `node scripts/validate-products.mjs` で呼ぶ。

   依存パッケージなし（node:fs / node:vm / node:path のみ）。

   参照:
   - docs/guidelines/薬機法準拠ガイドライン_v1.0.md（禁止表現 早見表）
   - docs/specs/診断ロジック設計書_v1.1.md / 推薦ロジック仕様書_v1.0.md
   ===================================================================== */

import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
// 既定は app/data/products.js。第1引数でパスを上書きできる（テスト用）。
const PRODUCTS_PATH = process.argv[2]
  ? process.argv[2]
  : join(HERE, "..", "app", "data", "products.js");

/** budget として許容される値 */
const ALLOWED_BUDGET = ["core", "sub"];

/**
 * 薬機法・禁止表現の最小NGリスト。
 * ガイドライン（薬機法準拠ガイドライン_v1.0.md §2）に合わせて拡張してよい。
 * 部分一致で検出する（例: "効果的" は "効果" にヒットする）。
 */
const NG_WORDS = [
  "効く", "効果", "治る", "治療", "改善", "予防", "解消",
  "美白", "消える", "アンチエイジング",
  "最強", "最適", "No.1", "医薬品級", "保証",
  "刺激ゼロ", "安全な成分",
];

/**
 * products.js（window.PRODUCTS に IIFE で代入する形式）を Node から読む。
 * ES module ではないので vm でサンドボックス実行して window.PRODUCTS を取り出す。
 * @returns {Array<Object>}
 */
function loadProducts() {
  const src = readFileSync(PRODUCTS_PATH, "utf8");
  const sandbox = { window: {} };
  runInNewContext(src, sandbox, { filename: PRODUCTS_PATH });
  const products = sandbox.window.PRODUCTS;
  if (!Array.isArray(products)) {
    throw new Error("window.PRODUCTS が配列として取得できませんでした");
  }
  return products;
}

/**
 * 1商品の必須項目・型・禁止表現を検証し、エラーメッセージ配列を返す。
 * @param {Object} p
 * @param {number} index
 * @param {Set<string>} seenIds
 * @returns {string[]}
 */
function validateProduct(p, index, seenIds) {
  const errors = [];
  const label = p && typeof p.id === "string" ? p.id : `#${index}`;
  const push = (field, reason) => errors.push(`[ERROR] ${label}.${field}: ${reason}`);

  if (typeof p !== "object" || p === null) {
    return [`[ERROR] #${index}: オブジェクトではありません`];
  }

  // --- 必須の文字列項目 ---
  for (const field of ["id", "category", "name", "feel", "scent"]) {
    if (typeof p[field] !== "string" || p[field].trim() === "") {
      push(field, "必須の文字列が欠落または空です");
    }
  }

  // --- id の重複 ---
  if (typeof p.id === "string") {
    if (seenIds.has(p.id)) push("id", "id が重複しています");
    else seenIds.add(p.id);
  }

  // --- 数値項目（正の数）---
  for (const field of ["price", "volume"]) {
    if (typeof p[field] !== "number" || !Number.isFinite(p[field]) || p[field] <= 0) {
      push(field, "正の数である必要があります");
    }
  }

  // --- budget ---
  if (!ALLOWED_BUDGET.includes(p.budget)) {
    push("budget", `"core" または "sub" のみ許容（現在: ${JSON.stringify(p.budget)}）`);
  }

  // --- ingredients（非空の文字列配列）---
  if (!Array.isArray(p.ingredients) || p.ingredients.length === 0) {
    push("ingredients", "非空の配列である必要があります");
  } else if (!p.ingredients.every((x) => typeof x === "string" && x.trim() !== "")) {
    push("ingredients", "すべての要素が非空の文字列である必要があります");
  }

  // --- 薬機法・禁止表現の検出（文字列フィールド全対象）---
  const textTargets = [
    ["name", p.name],
    ["feel", p.feel],
    ["scent", p.scent],
    ...(Array.isArray(p.ingredients)
      ? p.ingredients.map((v, i) => [`ingredients[${i}]`, v])
      : []),
  ];
  for (const [field, value] of textTargets) {
    if (typeof value !== "string") continue;
    for (const ng of NG_WORDS) {
      if (value.includes(ng)) {
        push(field, `禁止表現「${ng}」を含みます（薬機法ガイドライン §2）`);
      }
    }
  }

  return errors;
}

function main() {
  let products;
  try {
    products = loadProducts();
  } catch (e) {
    console.error(`[ERROR] products.js の読み込みに失敗: ${e.message}`);
    process.exit(1);
  }

  const seenIds = new Set();
  const allErrors = [];
  products.forEach((p, i) => {
    allErrors.push(...validateProduct(p, i, seenIds));
  });

  if (allErrors.length > 0) {
    allErrors.forEach((e) => console.error(e));
    console.error(`\nNG: ${products.length}件中 ${allErrors.length}件の違反を検出しました`);
    process.exit(1);
  }

  console.log(`OK: ${products.length}件の商品を検証、問題なし`);
  process.exit(0);
}

main();
