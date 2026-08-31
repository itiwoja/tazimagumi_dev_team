import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const contractsSource = readFileSync(new URL("../app/js/contracts.js", import.meta.url), "utf8");
const stateSource = readFileSync(new URL("../app/js/state.js", import.meta.url), "utf8");
const s3Source = readFileSync(new URL("../app/js/s3.js", import.meta.url), "utf8");
const screensSource = readFileSync(new URL("../app/js/screens.js", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../app/index.html", import.meta.url), "utf8");

function loadContracts() {
  const App = {};
  const window = { App, PRODUCTS: [] };
  vm.runInNewContext(contractsSource, { window }, { filename: "app/js/contracts.js" });
  return App;
}

function loadState(initialPrefs) {
  const values = new Map();
  if (initialPrefs !== undefined) values.set("midashinami:prefs:v1", JSON.stringify(initialPrefs));
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
  const App = {};
  const window = { App, localStorage };
  vm.runInNewContext(stateSource, { window, document: {} }, { filename: "app/js/state.js" });
  return { App, localStorage };
}

test("避けたい成分を含む商品だけを純粋に分け、入力を変更しない", () => {
  const App = loadContracts();
  const products = [
    { id: "keep", ingredients: ["セラミド"] },
    { id: "exclude", ingredients: ["ヒアルロン酸", "グリセリン"] },
    { id: "unknown", ingredients: [] }
  ];

  const result = App.filterByAvoidedIngredients(products, [" ヒアルロン酸 ", "ヒアルロン酸", null]);

  assert.deepEqual(Array.from(result.visible, (product) => product.id), ["keep", "unknown"]);
  assert.deepEqual(Array.from(result.excluded, (product) => product.id), ["exclude"]);
  assert.deepEqual(products[1].ingredients, ["ヒアルロン酸", "グリセリン"]);
  assert.deepEqual(Array.from(App.filterByAvoidedIngredients(products, []).visible, (product) => product.id), [
    "keep", "exclude", "unknown"
  ]);
});

test("回避設定は正規化して復元し、既存設定の保存時にも保持する", () => {
  const { App, localStorage } = loadState({
    reminderTime: "08:00",
    hasSeenIntro: true,
    avoidedIngredients: [" セラミド ", "セラミド", 10, ""]
  });

  assert.deepEqual(Array.from(App.loadPrefs().avoidedIngredients), ["セラミド"]);
  App.prefs = { reminderTime: "09:00", hasSeenIntro: true };
  App.syncPrefs();
  assert.deepEqual(JSON.parse(localStorage.getItem(App.LOCAL_KEYS.prefs)), {
    reminderTime: "09:00",
    hasSeenIntro: true,
    avoidedIngredients: ["セラミド"]
  });
});

test("S3は空カテゴリに同予算・タイプ不一致の代わりの候補を最大1件だけ示す", () => {
  assert.match(s3Source, /findTypeMismatchAlternative/);
  assert.match(s3Source, /productsForBudget\(budget\)/);
  assert.match(s3Source, /product\.typeTags\.indexOf\(expectedType\) === -1/);
  assert.match(s3Source, /products: \[alternative\], isAlternative: true/);
  assert.match(s3Source, /タイプは異なりますが、この商品は選んだ成分を含みません。/);
  assert.match(s3Source, /!avoided\.length \|\| !filtered\.excluded/);
});

test("設定の書き出しにはNG成分の設定も含める", () => {
  assert.match(screensSource, /prefs:\s*App\.prefs\s*\|\|\s*\{\}/);
});

test("画面にはユーザー主語の表現と設定チップの状態を置く", () => {
  const userVisibleSource = indexSource + s3Source;
  assert.match(indexSource, /避けたい成分を選ぶ/);
  assert.match(indexSource, /id="avoidChips"/);
  assert.match(indexSource, /id="s3AvoidStatus"/);
  assert.match(s3Source, /を含まない候補を表示しています（設定で変更できます）/);
  ["危険な成分", "安全な商品", "アレルギー対策"].forEach((forbidden) => {
    assert.equal(userVisibleSource.includes(forbidden), false);
  });
});
