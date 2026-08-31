import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const contractsSource = readFileSync("app/js/contracts.js", "utf8");
const screensSource = readFileSync("app/js/screens.js", "utf8");
const s3Source = readFileSync("app/js/s3.js", "utf8");

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(name) {
    this.values.add(name);
  }

  remove(name) {
    this.values.delete(name);
  }

  toggle(name, force) {
    const next = force === undefined ? !this.values.has(name) : Boolean(force);
    if (next) this.add(name);
    else this.remove(name);
    return next;
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeNode {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName;
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = Object.create(null);
    this.classList = new FakeClassList();
    this.listeners = Object.create(null);
    this.scrollCalls = [];
    this.style = {};
    this._textContent = "";
  }

  set textContent(value) {
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
    this.children.push(child);
    return child;
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  click() {
    this.listeners.click?.({ currentTarget: this });
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  scrollIntoView(options) {
    this.scrollCalls.push(options);
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const attribute = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (!attribute) return [];

    const matches = [];
    const visit = (node) => {
      const value = node.getAttribute(attribute[1]);
      if (value !== null && (attribute[2] === undefined || value === attribute[2])) {
        matches.push(node);
      }
      node.children.forEach(visit);
    };
    visit(this);
    return matches;
  }
}

function createDocument() {
  const document = {
    activeElement: null,
    body: null,
    budgetButton: null,
    createElement(tagName) {
      return new FakeNode(tagName, document);
    },
    createTextNode(text) {
      const node = new FakeNode("text", document);
      node.textContent = text;
      return node;
    },
    querySelector(selector) {
      return selector === "#s3 .budget__btn.is-on" ? document.budgetButton : null;
    },
    querySelectorAll() {
      return [];
    },
    getElementById(id) {
      return document.body.querySelectorAll('[id="' + id + '"]').find((node) => node === document.body || true) || null;
    }
  };
  document.body = new FakeNode("body", document);
  return document;
}

function loadContracts() {
  const window = { App: {} };
  vm.runInNewContext(contractsSource, { window, console }, { filename: "app/js/contracts.js" });
  return window.App;
}

function loadRoadmapScreen() {
  const document = createDocument();
  const App = loadContracts();
  const elements = {
    s2ResultType: document.createElement("p"),
    s2TodayCopy: document.createElement("p"),
    s2RoadmapLabel: document.createElement("p"),
    roadmapList: document.createElement("ol")
  };
  Object.values(elements).forEach((element) => document.body.appendChild(element));
  const categories = [];

  Object.assign(App, {
    $: (id) => elements[id],
    qAll: () => [],
    loadPrefs: () => ({}),
    state: { answers: [], qIndex: 0 },
    S1_TOTAL: 5,
    diagnose: () => ({ primaryType: "type1" }),
    buildRoadmap: () => [
      { order: 1, title: "化粧水", body: "説明", term: "化粧水" },
      { order: 2, title: "低刺激", body: "説明", term: "低刺激" }
    ],
    gotoCategory: (category, lane) => categories.push({ category, lane })
  });

  vm.runInNewContext(screensSource, { window: { App }, document, console }, { filename: "app/js/screens.js" });
  return { App, categories, elements };
}

function loadS3() {
  const document = createDocument();
  const budgetButton = document.createElement("button");
  budgetButton.setAttribute("data-budget", "core");
  document.budgetButton = budgetButton;
  const elements = {
    budgetNum: document.createElement("b"),
    s3CandHeading: document.createElement("p"),
    candGroups: document.createElement("div"),
    compareTable: document.createElement("div"),
    compareHint: document.createElement("p")
  };
  Object.values(elements).forEach((element) => document.body.appendChild(element));
  const timers = [];
  const App = {
    $: (id) => elements[id],
    qAll: (selector, root) => (root || document.body).querySelectorAll(selector),
    state: {
      completed: true,
      diagnosis: { primaryType: "type1", secondaryType: null, isComposite: false },
      answers: []
    },
    TYPE_META: { type1: { set: "メインセット" } },
    recommend: () => ({
      main: [{
        category: "化粧水",
        products: [{
          id: "lotion-1",
          category: "化粧水",
          name: "化粧水候補",
          price: 1000,
          volume: 150,
          ingredients: []
        }]
      }],
      sub: null,
      isComposite: false
    }),
    buildCompareTable: () => ({ columns: [], rows: [] }),
    toast() {}
  };
  const window = { App, setTimeout: (callback) => timers.push(callback) };
  vm.runInNewContext(s3Source, { window, document, console }, { filename: "app/js/s3.js" });

  const screenCalls = [];
  App.showScreen = (id) => {
    screenCalls.push(id);
    App.renderS3();
  };
  return { App, document, elements, screenCalls, timers };
}

test("概念対応表は明示語だけをカテゴリへ解決し、未対応語はnullを返す", () => {
  const App = loadContracts();

  assert.deepEqual({ ...App.CONCEPT_TO_CATEGORY }, {
    "化粧水": "化粧水",
    "乳液": "乳液",
    "オールインワン": "オールインワン",
    "アフターシェーブ": "アフターシェーブ"
  });
  assert.equal(App.resolveStepCategory({ term: "乳液" }), "乳液");
  assert.equal(App.resolveStepCategory({ term: "低刺激" }), null);
  assert.equal(App.resolveStepCategory({ term: "化粧水を使う" }), null);
  assert.equal(App.resolveStepCategory({}), null);
});

test("S2は解決可能なstepだけに補助buttonを描画し、カテゴリ遷移を呼ぶ", () => {
  const { App, categories, elements } = loadRoadmapScreen();

  App.renderRoadmap();
  const buttons = elements.roadmapList.children
    .flatMap((item) => item.children)
    .flatMap((body) => body.children)
    .filter((node) => node.className === "road__category-link");

  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].textContent, "「化粧水」の候補を見る →");
  assert.equal(buttons[0].getAttribute("aria-label"), "化粧水の候補を見る（商品画面へ移動）");
  buttons[0].click();
  assert.deepEqual(categories, [{ category: "化粧水", lane: undefined }]);
});

test("複合ロードマップはメインとサブの候補レーンを区別する", () => {
  const App = loadContracts();
  const steps = App.buildRoadmap({
    primaryType: "type2",
    secondaryType: "type1",
    isComposite: true
  });

  assert.equal(steps[0].lane, "main");
  assert.equal(steps[3].lane, "sub");
});

test("S3遷移はshowScreenを経由し、安全なIDのカテゴリへスクロール・focus・強調する", () => {
  const { App, document, screenCalls, timers } = loadS3();

  assert.equal(App.gotoCategory("化粧水"), true);
  const target = document.getElementById(App.categoryGroupId("化粧水"));

  assert.deepEqual(screenCalls, ["s3"]);
  assert.match(target.getAttribute("id"), /^cand-group-[A-Za-z0-9_-]+$/);
  assert.equal(target.scrollCalls.length, 1);
  assert.equal(target.scrollCalls[0].behavior, "smooth");
  assert.equal(target.scrollCalls[0].block, "start");
  assert.equal(document.activeElement.getAttribute("data-product-id"), "lotion-1");
  assert.equal(target.classList.contains("is-focused"), true);
  timers.forEach((callback) => callback());
  assert.equal(target.classList.contains("is-focused"), false);
});

test("S3遷移は候補ゼロのカテゴリにも空状態グループを作り、グループへfocusする", () => {
  const { App, document } = loadS3();

  assert.equal(App.gotoCategory("乳液"), true);
  const target = document.getElementById(App.categoryGroupId("乳液"));

  assert.ok(target);
  assert.equal(target.querySelector("[data-product-id]"), null);
  assert.equal(target.children[1].children[0].children[0].textContent, "この予算帯では候補が見つかりませんでした。");
  assert.strictEqual(document.activeElement, target);
  assert.equal(target.scrollCalls.length, 1);
  assert.equal(target.scrollCalls[0].behavior, "smooth");
  assert.equal(target.scrollCalls[0].block, "start");
});

test("同一カテゴリのメイン・サブ候補は一意なIDを持ち、指定レーンへ遷移する", () => {
  const { App, document, screenCalls } = loadS3();

  assert.notEqual(App.categoryGroupId("化粧水", "main"), App.categoryGroupId("化粧水", "sub"));
  assert.equal(App.gotoCategory("化粧水", "sub"), true);
  const target = document.getElementById(App.categoryGroupId("化粧水", "sub"));

  assert.deepEqual(screenCalls, ["s3"]);
  assert.ok(target);
  assert.equal(document.activeElement, target);
});
