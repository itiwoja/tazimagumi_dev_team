#!/usr/bin/env node
/* =====================================================================
   Ingredient fact data validator.
   Validates ingredient master + product ingredient maps for referential integrity.
   ===================================================================== */
"use strict";

import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const INGREDIENTS_PATH = resolve(ROOT, "app", "data", "ingredients.js");
const PRODUCT_INGREDIENTS_PATH = resolve(ROOT, "app", "data", "product-ingredients.js");

function loadModule(path, exportName) {
  const src = readFileSync(path, "utf8");
  const sandbox = { window: {} };
  runInNewContext(src, sandbox, { filename: path });
  const value = sandbox.window[exportName];
  if (!Array.isArray(value)) throw new Error(`${exportName} が配列として定義されていません。`);
  return value;
}

function main() {
  const ingredients = loadModule(INGREDIENTS_PATH, "INGREDIENTS");
  const productIngredients = loadModule(PRODUCT_INGREDIENTS_PATH, "PRODUCT_INGREDIENTS");

  const errors = [];
  const ingredientIds = new Set();
  const productIds = new Set();

  ingredients.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`[ERROR] INGREDIENTS[${index}]: オブジェクトではありません。`);
      return;
    }
    if (typeof item.id !== "string" || !item.id.trim()) {
      errors.push(`[ERROR] INGREDIENTS[${index}].id: 必須です。`);
    } else if (ingredientIds.has(item.id)) {
      errors.push(`[ERROR] INGREDIENTS[${index}].id: 重複しています (${item.id})`);
    } else {
      ingredientIds.add(item.id);
    }
    if (typeof item.name !== "string" || !item.name.trim()) {
      errors.push(`[ERROR] INGREDIENTS[${index}].name: 必須です。`);
    }
    if (typeof item.fact_tag !== "string" || !item.fact_tag.trim()) {
      errors.push(`[ERROR] INGREDIENTS[${index}].fact_tag: 必須です。`);
    }
    if (typeof item.note !== "string" || !item.note.trim()) {
      errors.push(`[ERROR] INGREDIENTS[${index}].note: 必須です。`);
    }
  });

  productIngredients.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`[ERROR] PRODUCT_INGREDIENTS[${index}]: オブジェクトではありません。`);
      return;
    }
    if (typeof item.product_id !== "string" || !item.product_id.trim()) {
      errors.push(`[ERROR] PRODUCT_INGREDIENTS[${index}].product_id: 必須です。`);
    } else {
      productIds.add(item.product_id);
    }
    if (typeof item.ingredient_id !== "string" || !item.ingredient_id.trim()) {
      errors.push(`[ERROR] PRODUCT_INGREDIENTS[${index}].ingredient_id: 必須です。`);
    } else if (!ingredientIds.has(item.ingredient_id)) {
      errors.push(`[ERROR] PRODUCT_INGREDIENTS[${index}].ingredient_id: 未定義の成分IDです (${item.ingredient_id})`);
    }
    if (typeof item.present !== "boolean") {
      errors.push(`[ERROR] PRODUCT_INGREDIENTS[${index}].present: true/false が必要です。`);
    }
  });

  if (productIds.size === 0) {
    errors.push("[ERROR] PRODUCT_INGREDIENTS: 商品IDが1件も見つかりません。");
  }

  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }

  console.log(`OK: ingredients ${ingredients.length}件 / product_ingredients ${productIngredients.length}件`);
}

main();
