import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function product(id, category, price, budget, typeTags, summary) {
  return {
    id,
    category,
    price,
    budget,
    typeTags,
    summary_one_liner: summary || ""
  };
}

function loadRecommend(products) {
  const sandbox = { window: {} };
  sandbox.window.PRODUCTS = products;
  sandbox.window.filterProductsByBudget = function (budget) {
    if (budget === "core") return products.slice();
    return products.filter((item) => item.budget === "sub");
  };
  vm.runInNewContext(readFileSync("app/js/contracts.js", "utf8"), sandbox, {
    filename: "app/js/contracts.js"
  });
  return sandbox.window.App.recommend;
}

function ids(groups) {
  if (!groups) return [];
  return Array.from(groups).flatMap((group) => Array.from(group.products, (item) => item.id));
}

test("camelCase typeTagsで単独タイプを推薦する", () => {
  const products = [
    product("oily", "化粧水", 900, "sub", ["type1"], "あり"),
    product("dry", "化粧水", 800, "sub", ["type2"], "あり")
  ];
  const recommend = loadRecommend(products);

  const result = recommend({ primaryType: "type1", secondaryType: null, isComposite: false }, "sub");

  assert.deepEqual(ids(result.main), ["oily"]);
  assert.equal(result.sub, null);
  assert.equal(result.isComposite, false);
});

test("複合タイプは第一タイプと第二タイプを分けて返す", () => {
  const products = [
    product("main", "化粧水", 900, "sub", ["type1"], "あり"),
    product("sub", "乳液", 1000, "sub", ["type2"], "あり")
  ];
  const recommend = loadRecommend(products);

  const result = recommend({ primaryType: "type1", secondaryType: "type2", isComposite: true }, "sub");

  assert.deepEqual(ids(result.main), ["main"]);
  assert.deepEqual(ids(result.sub), ["sub"]);
  assert.equal(result.isComposite, true);
});

test("第二タイプがtype6なら単独タイプとして扱う", () => {
  const products = [
    product("main", "化粧水", 900, "sub", ["type1"], "あり"),
    product("beginner", "オールインワン", 1000, "sub", ["type6"], "あり")
  ];
  const recommend = loadRecommend(products);

  const result = recommend({ primaryType: "type1", secondaryType: "type6", isComposite: true }, "sub");

  assert.deepEqual(ids(result.main), ["main"]);
  assert.equal(result.sub, null);
  assert.equal(result.isComposite, false);
});

test("subはsub商品のみ、coreはcoreとsubの両方を推薦する", () => {
  const products = [
    product("sub-item", "化粧水", 900, "sub", ["type1"], "あり"),
    product("core-item", "乳液", 2000, "core", ["type1"], "あり")
  ];
  const recommend = loadRecommend(products);
  const diagnosis = { primaryType: "type1", secondaryType: null, isComposite: false };

  assert.deepEqual(ids(recommend(diagnosis, "sub").main), ["sub-item"]);
  assert.deepEqual(ids(recommend(diagnosis, "core").main), ["sub-item", "core-item"]);
});

test("同一カテゴリを一致タイプ数、価格、説明ありの順で並べる", () => {
  const products = [
    product("same-no-summary", "化粧水", 1000, "sub", ["type1"]),
    product("cheap", "化粧水", 900, "sub", ["type1"]),
    product("dual", "化粧水", 1400, "sub", ["type1", "type2"]),
    product("same-with-summary", "化粧水", 1000, "sub", ["type1"], "説明あり")
  ];
  const recommend = loadRecommend(products);

  const result = recommend({ primaryType: "type1", secondaryType: "type2", isComposite: true }, "sub");

  assert.deepEqual(ids(result.main), ["dual", "cheap", "same-with-summary"]);
});

test("各カテゴリの候補を最大3件に制限する", () => {
  const products = [
    product("a", "化粧水", 500, "sub", ["type1"], "あり"),
    product("b", "化粧水", 600, "sub", ["type1"], "あり"),
    product("c", "化粧水", 700, "sub", ["type1"], "あり"),
    product("d", "化粧水", 800, "sub", ["type1"], "あり"),
    product("e", "乳液", 900, "sub", ["type1"], "あり")
  ];
  const recommend = loadRecommend(products);

  const result = recommend({ primaryType: "type1", secondaryType: null, isComposite: false }, "sub");

  assert.deepEqual(ids(result.main), ["a", "b", "c", "e"]);
  Array.from(result.main).forEach((group) => assert.ok(group.products.length <= 3));
});

test("商品配列と診断結果を変更しない", () => {
  const products = [product("a", "化粧水", 500, "sub", ["type1"], "あり")];
  const diagnosis = { primaryType: "type1", secondaryType: null, isComposite: false };
  const productsBefore = JSON.stringify(products);
  const diagnosisBefore = JSON.stringify(diagnosis);
  const recommend = loadRecommend(products);

  recommend(diagnosis, "sub");

  assert.equal(JSON.stringify(products), productsBefore);
  assert.equal(JSON.stringify(diagnosis), diagnosisBefore);
});
