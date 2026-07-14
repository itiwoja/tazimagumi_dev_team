import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const VALID_TYPES = new Set(["type1", "type2", "type3", "type4", "type5", "type6"]);

function loadProducts() {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync("app/data/products.js", "utf8"), sandbox, {
    filename: "app/data/products.js"
  });
  return sandbox.window.PRODUCTS;
}

const products = loadProducts();

test("商品マスターはMVP範囲の15〜20件を持つ", () => {
  assert.ok(products.length >= 15 && products.length <= 20, `商品数: ${products.length}`);
});

test("商品IDは重複しない", () => {
  const ids = products.map((product) => product.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("全商品が有効なcamelCase typeTagsを1件以上持つ", () => {
  products.forEach((product) => {
    assert.ok(Array.isArray(product.typeTags), `${product.id}.typeTags が配列ではありません`);
    assert.ok(product.typeTags.length > 0, `${product.id}.typeTags が空です`);
    product.typeTags.forEach((type) => {
      assert.ok(VALID_TYPES.has(type), `${product.id}.typeTags に不正値 ${type} があります`);
    });
  });
});

test("type1〜type6をすべてカバーする", () => {
  const covered = new Set(products.flatMap((product) => product.typeTags || []));
  assert.deepEqual([...covered].sort(), [...VALID_TYPES].sort());
});

test("予算帯の上限を守る", () => {
  products.forEach((product) => {
    assert.ok(product.budget === "sub" || product.budget === "core", `${product.id}.budget が不正です`);
    const limit = product.budget === "sub" ? 1500 : 5000;
    assert.ok(product.price <= limit, `${product.id}: ${product.budget} の上限 ${limit}円を超えています（${product.price}円）`);
  });
});

test("mL単位のProduct契約で扱えないセット商品を含めない", () => {
  products.forEach((product) => {
    assert.doesNotMatch(
      `${product.category} ${product.name}`,
      /セット/,
      `${product.id}: セット商品にはmL以外を表せる単位モデルが必要です`
    );
  });
});
