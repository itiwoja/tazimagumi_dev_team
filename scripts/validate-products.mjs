#!/usr/bin/env node
/* =====================================================================
   商品データ検証スクリプト（Issue #73 [提案-M1]）
   ---------------------------------------------------------------------
   app/data/products.js の必須項目チェックと、薬機法上の禁止表現の機械検出。
   - 依存パッケージなし（node:fs / node:vm / node:path / node:url のみ）。
   - CI（#81 PRチェックCI）から `node scripts/validate-products.mjs` で呼ぶ。
   - 違反ゼロなら exit 0、違反があれば一覧を出して exit 1。

   方針の根拠:
   - 商品データ整備方針（app/data/products.js 冒頭・要件定義書 REQ-03/05）
   - docs/guidelines/薬機法準拠ガイドライン_v1.0.md
   ===================================================================== */
"use strict";

import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// 既定は app/data/products.js。第1引数でパスを差し替え可（テスト・CIでの再利用向け）。
const PRODUCTS_PATH = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(HERE, "..", "app", "data", "products.js");

/** 予算帯の許容値。 */
const VALID_BUDGETS = ["core", "sub"];

/**
 * 薬機法上の禁止表現（効能の断定・医薬品的表現）。
 * ここに語を足せば検出が広がる。誤検知を避けるため「事実表現」は入れない
 * （例:「無香料」「アルコールフリー」は合法なので含めない）。
 */
const FORBIDDEN_EXPRESSIONS = [
  "効く", "効果", "効能", "治る", "治療", "改善", "予防", "解消", "根治",
  "美白", "シミが消える", "しわが消える", "ニキビが治る", "アンチエイジング",
  "若返り", "デトックス", "最強", "最適", "No.1", "ナンバーワン",
  "医薬品", "医薬品級", "処方", "副作用なし", "安全", "危険"
];

/** products.js を安全に読み込み、window.PRODUCTS を取り出す。 */
function loadProducts() {
  const src = readFileSync(PRODUCTS_PATH, "utf8");
  const sandbox = { window: {} };
  runInNewContext(src, sandbox, { filename: PRODUCTS_PATH });
  const products = sandbox.window.PRODUCTS;
  if (!Array.isArray(products)) {
    throw new Error("window.PRODUCTS が配列として定義されていません。");
  }
  return products;
}

/** 1商品の必須項目・型を検証し、エラーメッセージ配列を返す。 */
function validateShape(p, index) {
  const errors = [];
  const at = (field, msg) => errors.push(`[ERROR] products[${index}] (${p && p.id ? p.id : "id不明"}).${field}: ${msg}`);

  if (typeof p !== "object" || p === null) {
    return [`[ERROR] products[${index}]: オブジェクトではありません。`];
  }
  if (typeof p.id !== "string" || p.id.trim() === "") at("id", "空でない文字列が必要です。");
  if (typeof p.category !== "string" || p.category.trim() === "") at("category", "空でない文字列が必要です。");
  if (typeof p.name !== "string" || p.name.trim() === "") at("name", "空でない文字列が必要です。");
  if (typeof p.price !== "number" || !(p.price > 0)) at("price", "正の数（税込円）が必要です。");
  if (typeof p.volume !== "number" || !(p.volume > 0)) at("volume", "正の数（mL）が必要です。");
  if (VALID_BUDGETS.indexOf(p.budget) === -1) at("budget", `"core" か "sub" のみ許容（実値: ${JSON.stringify(p.budget)}）。`);
  if (typeof p.feel !== "string") at("feel", "文字列が必要です。");
  if (typeof p.scent !== "string") at("scent", "文字列が必要です。");
  if (!Array.isArray(p.ingredients) || p.ingredients.length === 0) {
    at("ingredients", "非空の文字列配列が必要です。");
  } else if (!p.ingredients.every((t) => typeof t === "string")) {
    at("ingredients", "全要素が文字列である必要があります。");
  }
  return errors;
}

/** 全文字列フィールドから薬機法上の禁止表現を検出する。 */
function validateExpressions(p, index) {
  const errors = [];
  const fields = { name: p.name, feel: p.feel, scent: p.scent };
  const scan = (field, value) => {
    if (typeof value !== "string") return;
    for (const word of FORBIDDEN_EXPRESSIONS) {
      if (value.indexOf(word) !== -1) {
        errors.push(`[ERROR] products[${index}] (${p.id}).${field}: 禁止表現「${word}」を含みます（薬機法）。`);
      }
    }
  };
  Object.keys(fields).forEach((f) => scan(f, fields[f]));
  if (Array.isArray(p.ingredients)) {
    p.ingredients.forEach((tag, i) => scan(`ingredients[${i}]`, tag));
  }
  return errors;
}

function main() {
  let products;
  try {
    products = loadProducts();
  } catch (e) {
    console.error(`[ERROR] ${PRODUCTS_PATH} を読み込めませんでした: ${e.message}`);
    process.exit(1);
  }

  const errors = [];
  const seenIds = new Set();

  products.forEach((p, index) => {
    errors.push(...validateShape(p, index));
    if (p && typeof p.id === "string") {
      if (seenIds.has(p.id)) errors.push(`[ERROR] products[${index}].id: id "${p.id}" が重複しています。`);
      seenIds.add(p.id);
    }
    if (p && typeof p === "object") errors.push(...validateExpressions(p, index));
  });

  if (errors.length > 0) {
    console.error(errors.join("\n"));
    console.error(`\nNG: ${products.length} 件中 ${errors.length} 件の問題を検出しました。`);
    process.exit(1);
  }

  console.log(`OK: ${products.length} 件の商品を検証、問題なし。`);
  process.exit(0);
}

main();
