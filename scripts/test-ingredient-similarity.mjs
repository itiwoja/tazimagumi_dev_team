import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function product(id, category, ingredients) {
  return {
    id,
    category,
    name: id,
    price: 1000,
    volume: 150,
    ingredients,
    summary_one_liner: "説明"
  };
}

function loadContracts() {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync("app/js/contracts.js", "utf8"), sandbox, {
    filename: "app/js/contracts.js"
  });
  return sandbox.window.App;
}

test("重複を除いた完全一致の成分タグを同カテゴリの類似ペアとして返す", () => {
  const App = loadContracts();
  const products = [
    product("a", "化粧水", ["A", "A", "B"]),
    product("b", "化粧水", ["A", "B", "B"])
  ];

  const pairs = App.findSimilarPairs(products);

  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].score, 1);
  assert.deepEqual(Array.from(pairs[0].shared), ["A", "B"]);
});

test("共通成分がないペアとカテゴリ違いのペアを既定閾値では返さない", () => {
  const App = loadContracts();
  const products = [
    product("no-match", "化粧水", ["A"]),
    product("other", "化粧水", ["B"]),
    product("different-category", "乳液", ["A"])
  ];

  assert.deepEqual(Array.from(App.findSimilarPairs(products)), []);
});

test("閾値境界を含め、空の成分集合でもNaNを返さない", () => {
  const App = loadContracts();
  const boundaryProducts = [
    product("a", "化粧水", ["A", "B", "C", "D"]),
    product("b", "化粧水", ["A", "B", "C", "D", "E"])
  ];
  const emptyProducts = [
    product("empty-a", "化粧水", []),
    product("empty-b", "化粧水", [])
  ];

  assert.equal(App.findSimilarPairs(boundaryProducts, { threshold: 0.8 }).length, 1);
  assert.equal(App.findSimilarPairs(boundaryProducts, 0.81).length, 0);

  const emptyPair = App.findSimilarPairs(emptyProducts, { threshold: 0 })[0];
  assert.equal(emptyPair.score, 0);
  assert.equal(Number.isNaN(emptyPair.score), false);
});

test("スコア降順・入力順で決定的に並べ、入力配列と商品を変更しない", () => {
  const App = loadContracts();
  const products = [
    product("first", "化粧水", ["A", "B"]),
    product("second", "化粧水", ["A", "B"]),
    product("third", "化粧水", ["A"])
  ];
  const before = JSON.stringify(products);

  const pairs = App.findSimilarPairs(products, { threshold: 0.5 });

  assert.deepEqual(Array.from(pairs, (pair) => [pair.a.id, pair.b.id, pair.score]), [
    ["first", "second", 1],
    ["first", "third", 0.5],
    ["second", "third", 0.5]
  ]);
  assert.equal(JSON.stringify(products), before);
});

test("比較表には閾値以上の代表ペアだけを列数を保って追加する", () => {
  const App = loadContracts();
  const matched = [
    product("a", "化粧水", ["A", "B", "C", "D"]),
    product("b", "化粧水", ["A", "B", "C", "D", "E"]),
    product("c", "化粧水", ["Z"])
  ];

  const table = App.buildCompareTable(matched);
  const similarityRow = Array.from(table.rows).at(-1);

  assert.equal(similarityRow.label, "共通する成分タグ");
  assert.deepEqual(Array.from(similarityRow.values), ["4個／全5種", "4個／全5種", "—"]);
  assert.equal(similarityRow.values.length, table.columns.length);

  const noMatchTable = App.buildCompareTable([
    product("no-a", "化粧水", ["A"]),
    product("no-b", "化粧水", ["B"])
  ]);
  assert.equal(Array.from(noMatchTable.rows).some((row) => row.label === "共通する成分タグ"), false);
});
