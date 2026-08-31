import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  toggle(name, force) {
    const next = force === undefined ? !this.values.has(name) : Boolean(force);
    if (next) this.values.add(name);
    else this.values.delete(name);
    return next;
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeNode {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName;
    this.ownerDocument = ownerDocument || null;
    this.children = [];
    this.attributes = Object.create(null);
    this.classList = new FakeClassList();
    this.style = {};
    this.focusCount = 0;
    this._textContent = "";
  }

  set textContent(value) {
    const active = this.ownerDocument && this.ownerDocument.activeElement;
    if (active && this.containsNode(active) && this.ownerDocument.body) {
      this.ownerDocument.activeElement = this.ownerDocument.body;
    }
    this._textContent = String(value);
    this.children = [];
  }

  get textContent() {
    return this._textContent;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name)
      ? this.attributes[name]
      : null;
  }

  appendChild(child) {
    child.parentNode = this;
    if (!child.ownerDocument) child.ownerDocument = this.ownerDocument;
    this.children.push(child);
    return child;
  }

  containsNode(target) {
    return this === target || this.children.some((child) => child.containsNode(target));
  }

  focus() {
    this.focusCount += 1;
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }

  querySelectorAll(selector) {
    const matches = [];
    const attribute = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    const matchesSelector = (node) => {
      if (!attribute) return false;
      const value = node.getAttribute(attribute[1]);
      return value !== null && (attribute[2] === undefined || value === attribute[2]);
    };
    const visit = (node) => {
      if (matchesSelector(node)) matches.push(node);
      node.children.forEach(visit);
    };
    visit(this);
    return matches;
  }
}

function product(id, category, name) {
  return {
    id,
    category,
    name,
    price: 1000,
    volume: 150,
    ingredients: [],
    summary_one_liner: "説明"
  };
}

function collectProductIds(node) {
  return Array.from(node.querySelectorAll("[data-product-id]"), (button) => (
    button.getAttribute("data-product-id")
  ));
}

function loadScreens(
  s3Source = readFileSync("app/js/s3.js", "utf8"),
  screensSource = readFileSync("app/js/screens.js", "utf8")
) {
  const products = {
    shared: product("shared", "化粧水", "共通商品"),
    mainOnly: product("main-only", "化粧水", "メイン商品"),
    subOnly: product("sub-only", "乳液", "サブ商品"),
    fourth: product("fourth", "洗顔料", "4件目の商品")
  };
  const budgetButton = new FakeNode("button");
  const document = {
    activeElement: null,
    body: null,
    querySelector(selector) {
      if (selector === "#s3 .budget__btn.is-on") return budgetButton;
      return null;
    },
    querySelectorAll() {
      return [];
    },
    createElement(tagName) {
      return new FakeNode(tagName, document);
    },
    createDocumentFragment() {
      return new FakeNode("fragment", document);
    },
    createTextNode(text) {
      const node = new FakeNode("text", document);
      node.textContent = text;
      return node;
    }
  };
  document.body = new FakeNode("body", document);
  budgetButton.ownerDocument = document;
  budgetButton.classList.toggle("is-on", true);
  budgetButton.setAttribute("data-budget", "core");

  const elements = {
    budgetNum: new FakeNode("b", document),
    s3CandHeading: new FakeNode("p", document),
    candGroups: new FakeNode("div", document),
    compareTable: new FakeNode("div", document),
    compareHint: new FakeNode("p", document),
    cta: new FakeNode("button", document),
    qstack: new FakeNode("div", document),
    s1Remain: new FakeNode("p", document)
  };
  const outside = new FakeNode("main", document);
  let comparedProducts = [];
  const toastMessages = [];
  const App = {
    $: (id) => elements[id],
    qAll: (selector, root) => Array.from((root || document).querySelectorAll(selector)),
    loadPrefs: () => ({}),
    S1_TOTAL: 5,
    state: {
      completed: true,
      diagnosis: { primaryType: "type1", secondaryType: "type2", isComposite: true },
      answers: [],
      qIndex: 0,
      current: "s3"
    },
    TYPE_META: {
      type1: { name: "メイン", set: "メインセット" },
      type2: { name: "サブ", set: "サブセット" }
    },
    recommend: () => ({
      main: [{ category: "化粧水", products: [products.shared, products.mainOnly, products.fourth] }],
      sub: [{ category: "乳液", products: [products.shared, products.subOnly] }],
      isComposite: true
    }),
    buildCompareTable: (selected) => {
      comparedProducts = selected;
      return {
        columns: selected,
        rows: [{
          label: "価格",
          values: selected.map(() => "¥1000"),
          differs: false
        }]
      };
    },
    updateProgress() {},
    answeredCount: () => 0,
    setBackVisible() {},
    toast(message) { toastMessages.push(message); }
  };
  const window = {
    App,
    filterProductsByBudget: () => [1, 2, 3, 4, 5]
  };

  vm.runInNewContext(s3Source, {
    window,
    document,
    console
  }, { filename: "app/js/s3.js" });
  vm.runInNewContext(screensSource, {
    window,
    document,
    console
  }, { filename: "app/js/screens.js" });

  const findProductButton = (id) => Array.from(
    elements.candGroups.querySelectorAll("[data-product-id]")
  ).find((button) => button.getAttribute("data-product-id") === id);
  return {
    App,
    document,
    outside,
    budgetButton,
    elements,
    toastMessages,
    findProductButton,
    comparedProducts: () => comparedProducts
  };
}

function assertFocusRestored(screensSource) {
  const { App, document, findProductButton } = loadScreens(screensSource);

  App.renderS3();
  const previousButton = findProductButton("shared");
  previousButton.focus();
  App.toggleCompareProduct("shared");
  const currentButton = findProductButton("shared");

  assert.notStrictEqual(currentButton, previousButton);
  assert.strictEqual(document.activeElement, currentButton);
}

test("S3の複合推薦は商品ID単位で候補件数と候補一覧を一意化する", () => {
  const { App, elements } = loadScreens();

  App.renderS3();

  assert.equal(elements.budgetNum.textContent, "4");
  assert.deepEqual(collectProductIds(elements.candGroups), ["shared", "main-only", "fourth", "sub-only"]);
});

test("S3 module分割の読込順・cache・行数ガードを満たす", () => {
  const screensSource = readFileSync("app/js/screens.js", "utf8");
  const s3Source = readFileSync("app/js/s3.js", "utf8");
  const indexSource = readFileSync("app/index.html", "utf8");
  const swSource = readFileSync("app/sw.js", "utf8");
  const contractsSource = readFileSync("app/js/contracts.js", "utf8");
  const order = ["contracts.js", "disclaimer.js", "s3.js", "screens.js"];

  assert.ok(screensSource.split(/\r?\n/).length <= 800);
  assert.equal(screensSource.includes("selectedCompareIds"), false);
  assert.equal(s3Source.includes("selectedCompareIds"), true);
  assert.ok(contractsSource.includes("s3.js の App.renderS3"));
  order.slice(0, -1).forEach((before, index) => {
    assert.ok(indexSource.indexOf(before) < indexSource.indexOf(order[index + 1]));
    assert.ok(swSource.indexOf(before) < swSource.indexOf(order[index + 1]));
  });
  assert.match(swSource, /CACHE_NAME\s*=\s*["']tazimagumi-app-v31["']/);
  assert.ok(swSource.includes('"./js/s3.js"'));
});

test("S3の単独タイプはmain候補だけを表示する", () => {
  const { App, elements } = loadScreens();

  App.state.diagnosis = { primaryType: "type1", secondaryType: null, isComposite: false };
  App.recommend = () => ({
    main: [{
      category: "化粧水",
      products: [{
        id: "single-main",
        category: "化粧水",
        name: "単独タイプ商品",
        price: 1000,
        volume: 150,
        ingredients: [],
        summary_one_liner: "説明"
      }]
    }],
    sub: null,
    isComposite: false
  });

  App.renderS3();

  assert.equal(elements.s3CandHeading.textContent, "メインセットの候補");
  assert.equal(elements.budgetNum.textContent, "1");
  assert.deepEqual(collectProductIds(elements.candGroups), ["single-main"]);
  assert.equal(elements.candGroups.textContent.includes("向けの候補もあわせて"), false);
});

test("S3比較表は2件・3件比較と解除を一意な列で処理する", () => {
  const { App, elements, comparedProducts, findProductButton, document } = loadScreens();

  App.renderS3();
  const previousShared = findProductButton("shared");
  previousShared.focus();
  App.toggleCompareProduct("shared");
  const currentShared = findProductButton("shared");
  assert.notStrictEqual(currentShared, previousShared);
  assert.strictEqual(document.activeElement, currentShared);

  const previousMain = findProductButton("main-only");
  previousMain.focus();
  App.toggleCompareProduct("main-only");
  const currentMain = findProductButton("main-only");
  assert.notStrictEqual(currentMain, previousMain);
  assert.strictEqual(document.activeElement, currentMain);

  assert.deepEqual(Array.from(comparedProducts(), (item) => item.id), ["shared", "main-only"]);
  assert.equal(elements.compareHint.textContent, "2件を比較中。候補から最大3件まで選べます。");
  assert.equal(document.activeElement.getAttribute("data-product-id"), "main-only");

  const previousSub = findProductButton("sub-only");
  previousSub.focus();
  App.toggleCompareProduct("sub-only");
  const currentSub = findProductButton("sub-only");
  assert.notStrictEqual(currentSub, previousSub);
  assert.strictEqual(document.activeElement, currentSub);

  assert.deepEqual(Array.from(comparedProducts(), (item) => item.id), ["shared", "main-only", "sub-only"]);
  assert.equal(elements.compareHint.textContent, "3件を比較中。候補から最大3件まで選べます。");
  assert.ok(elements.compareTable.querySelectorAll('[role="cell"]').length > 0);
  assert.ok(elements.compareTable.querySelectorAll('[role="columnheader"]').length > 0);
  assert.ok(elements.compareTable.querySelectorAll('[role="rowheader"]').length > 0);

  const previousSubForDeselect = findProductButton("sub-only");
  previousSubForDeselect.focus();
  App.toggleCompareProduct("sub-only");
  const currentSubAfterDeselect = findProductButton("sub-only");

  assert.deepEqual(Array.from(comparedProducts(), (item) => item.id), ["shared", "main-only"]);
  assert.notStrictEqual(currentSubAfterDeselect, previousSubForDeselect);
  assert.equal(currentSubAfterDeselect.getAttribute("aria-pressed"), "false");
  assert.strictEqual(document.activeElement, currentSubAfterDeselect);
});

test("S3の4件目拒否は選択数・フォーカス・通知を維持する", () => {
  const { App, document, findProductButton, toastMessages } = loadScreens();

  App.renderS3();
  ["shared", "main-only", "sub-only"].forEach((id) => {
    findProductButton(id).focus();
    App.toggleCompareProduct(id);
  });
  const fourthButton = findProductButton("fourth");
  fourthButton.focus();

  App.toggleCompareProduct("fourth");

  assert.strictEqual(document.activeElement, fourthButton);
  assert.equal(toastMessages.at(-1), "比較できるのは最大3商品までです");
  assert.deepEqual(
    ["shared", "main-only", "sub-only"].map((id) => findProductButton(id).getAttribute("aria-pressed")),
    ["true", "true", "true"]
  );
  assert.equal(findProductButton("fourth").getAttribute("aria-pressed"), "false");
});

test("通常描画・予算変更・resetでは候補へフォーカスを奪わない", () => {
  const { App, document, outside, budgetButton, elements, findProductButton } = loadScreens();

  App.renderS3();
  findProductButton("shared").focus();
  App.toggleCompareProduct("shared");
  assert.equal(typeof App.resetS3Comparison, "function");
  App.resetS3Comparison();
  App.renderS3();
  assert.equal(findProductButton("shared").getAttribute("aria-pressed"), "false");

  outside.focus();
  App.renderS3();
  assert.strictEqual(document.activeElement, outside);
  assert.equal(findProductButton("shared").focusCount, 0);

  outside.focus();
  budgetButton.setAttribute("data-budget", "sub");
  App.renderS3();
  assert.equal(findProductButton("shared").getAttribute("aria-pressed"), "false");
  assert.equal(findProductButton("shared").focusCount, 0);
  assert.strictEqual(document.activeElement, outside);

  outside.focus();
  App.toggleCompareProduct("shared");
  assert.strictEqual(document.activeElement, outside);
  outside.focus();
  App.resetS1();
  assert.strictEqual(document.activeElement, outside);
  App.state.completed = true;
  App.state.diagnosis = { primaryType: "type1", secondaryType: "type2", isComposite: true };
  budgetButton.setAttribute("data-budget", "core");
  App.renderS3();
  assert.equal(findProductButton("shared").getAttribute("aria-pressed"), "false");
  assert.equal(findProductButton("shared").focusCount, 0);
  assert.strictEqual(document.activeElement, outside);
  assert.equal(elements.compareHint.textContent, "候補から2〜3件選ぶと比較表が表示されます。");
});

test("renderS3外の予算件数は従来どおり予算フィルタ件数を使う", () => {
  const { App, elements } = loadScreens();

  App.updateBudgetCount("core");

  assert.equal(elements.budgetNum.textContent, "5");
});

test("focus復元呼出しを除去したmutationはidentity回帰を失敗させる", () => {
  const source = readFileSync("app/js/s3.js", "utf8");
  const invocation = "    if (shouldRestoreFocus) restoreCandidateFocus(productId);";
  assert.equal(source.includes(invocation), true);

  const mutatedSource = source.replace(
    invocation,
    "    if (shouldRestoreFocus) { /* mutation: focus restoration removed */ }"
  );

  assert.throws(
    () => assertFocusRestored(mutatedSource),
    assert.AssertionError
  );
});
