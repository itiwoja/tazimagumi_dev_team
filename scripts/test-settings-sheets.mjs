import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const mainSource = readFileSync(new URL("../app/js/main.js", import.meta.url), "utf8");

function createEvent(type, init = {}) {
  return {
    type,
    ...init,
    target: null,
    defaultPrevented: false,
    immediatePropagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopImmediatePropagation() {
      this.immediatePropagationStopped = true;
    }
  };
}

function dispatchListeners(listeners, event, target) {
  event.target = event.target || target;
  for (const listener of listeners || []) {
    listener.call(target, event);
    if (event.immediatePropagationStopped) break;
  }
  return !event.defaultPrevented;
}

function createHarness() {
  const documentListeners = new Map();
  const windowListeners = new Map();
  const elements = {};
  let document;

  class FakeElement {
    constructor(id = "") {
      this.id = id;
      this.hidden = false;
      this.disabled = false;
      this.value = "";
      this.textContent = "";
      this.style = { cssText: "" };
      this.offsetParent = {};
      this.listeners = new Map();
      this.attributes = new Map();
      this.classList = {
        add() {},
        remove() {}
      };
    }

    addEventListener(type, listener) {
      const listeners = this.listeners.get(type) || [];
      listeners.push(listener);
      this.listeners.set(type, listeners);
    }

    dispatchEvent(event) {
      return dispatchListeners(this.listeners.get(event.type), event, this);
    }

    click() {
      const event = createEvent("click");
      this.dispatchEvent(event);
      return event;
    }

    focus() {
      document.activeElement = this;
    }

    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    }

    getAttribute(name) {
      return this.attributes.has(name) ? this.attributes.get(name) : null;
    }

    hasAttribute(name) {
      return this.attributes.has(name);
    }

    removeAttribute(name) {
      this.attributes.delete(name);
    }

    insertBefore() {}
    appendChild() {}
    remove() {}
    querySelector() { return null; }
    closest() { return null; }
  }

  const requiredIds = [
    "cta",
    "qstack",
    "s2",
    "sheet",
    "sheetClose",
    "sheetScrim",
    "settingsSheet",
    "settingsClose",
    "settingsScrim",
    "settingsBtn",
    "reminderTime",
    "reminderSaveBtn",
    "resetDiagnosisBtn",
    "exportDataBtn",
    "clearDataBtn",
    "clearConfirm",
    "clearConfirmBtn",
    "clearCancelBtn",
    "privacyOpenBtn",
    "privacySheet",
    "privacyClose",
    "privacyScrim"
  ];

  for (const id of requiredIds) elements[id] = new FakeElement(id);
  elements.sheet.hidden = true;
  elements.settingsSheet.hidden = true;
  elements.clearConfirm.hidden = true;
  elements.privacySheet.hidden = true;

  const dock = new FakeElement("dock");
  document = {
    activeElement: null,
    visibilityState: "visible",
    createElement() {
      return new FakeElement();
    },
    querySelector(selector) {
      return selector === ".dock" ? dock : null;
    },
    addEventListener(type, listener) {
      const listeners = documentListeners.get(type) || [];
      listeners.push(listener);
      documentListeners.set(type, listeners);
    },
    dispatchEvent(event) {
      return dispatchListeners(documentListeners.get(event.type), event, document);
    }
  };

  const state = {
    current: "s1",
    qIndex: 0,
    answers: new Array(5).fill(null),
    completed: false,
    records: { todayDone: false, weekRating: null }
  };
  const App = {
    state,
    SCREENS: ["s1", "s2", "s3", "s4"],
    prefs: { reminderTime: "", hasSeenIntro: true },
    $(id) {
      return elements[id] || null;
    },
    qAll(selector, root) {
      if (selector === "button, input" && root === elements.settingsSheet) {
        return [elements.settingsClose, elements.reminderTime, elements.privacyOpenBtn];
      }
      return [];
    },
    nextQuestion() {},
    prevQuestion() {},
    showScreen() {},
    resetS1() {},
    saveReminderTime() {},
    clearLocalData() {},
    exportData() {},
    updateBudgetCount() {},
    updateProgress() {},
    renderQuestion() {},
    persist() {},
    restore() { return false; },
    toast() {}
  };
  const window = {
    App,
    document,
    location: { search: "" },
    addEventListener(type, listener) {
      const listeners = windowListeners.get(type) || [];
      listeners.push(listener);
      windowListeners.set(type, listeners);
    }
  };
  window.window = window;

  vm.runInNewContext(mainSource, {
    console,
    document,
    window,
    clearTimeout,
    setTimeout
  }, { filename: "app/js/main.js" });

  return {
    document,
    elements,
    keydown(key) {
      const event = createEvent("keydown", { key, shiftKey: false });
      document.dispatchEvent(event);
      return event;
    }
  };
}

function openSettings(harness) {
  harness.elements.settingsBtn.focus();
  harness.elements.settingsBtn.click();
  assert.equal(harness.elements.settingsSheet.hidden, false);
}

function openPrivacy(harness) {
  openSettings(harness);
  harness.elements.privacyOpenBtn.focus();
  harness.elements.privacyOpenBtn.click();
  assert.equal(harness.elements.privacySheet.hidden, false);
  assert.equal(harness.document.activeElement, harness.elements.privacyClose);
}

test("privacyのEscapeはprivacyだけを閉じ、設定とフォーカスを維持する", () => {
  const harness = createHarness();
  openPrivacy(harness);

  const event = harness.keydown("Escape");

  assert.equal(harness.elements.privacySheet.hidden, true);
  assert.equal(harness.elements.settingsSheet.hidden, false);
  assert.equal(harness.document.activeElement, harness.elements.privacyOpenBtn);
  assert.equal(event.defaultPrevented, true);
  assert.equal(event.immediatePropagationStopped, true);
});

test("privacyの閉じるボタンはprivacyだけを閉じて起点へフォーカスを戻す", () => {
  const harness = createHarness();
  openPrivacy(harness);

  harness.elements.privacyClose.click();

  assert.equal(harness.elements.privacySheet.hidden, true);
  assert.equal(harness.elements.settingsSheet.hidden, false);
  assert.equal(harness.document.activeElement, harness.elements.privacyOpenBtn);
});

test("privacyのscrimはprivacyだけを閉じて起点へフォーカスを戻す", () => {
  const harness = createHarness();
  openPrivacy(harness);

  harness.elements.privacyScrim.click();

  assert.equal(harness.elements.privacySheet.hidden, true);
  assert.equal(harness.elements.settingsSheet.hidden, false);
  assert.equal(harness.document.activeElement, harness.elements.privacyOpenBtn);
});

test("設定だけが開いている時のEscapeは設定を閉じて起点へフォーカスを戻す", () => {
  const harness = createHarness();
  openSettings(harness);

  const event = harness.keydown("Escape");

  assert.equal(harness.elements.settingsSheet.hidden, true);
  assert.equal(harness.document.activeElement, harness.elements.settingsBtn);
  assert.equal(event.defaultPrevented, true);
});
