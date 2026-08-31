import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const stateSource = readFileSync(new URL("../app/js/state.js", import.meta.url), "utf8");
const screensSource = readFileSync(new URL("../app/js/screens.js", import.meta.url), "utf8");

function createApp(saved = null) {
  const App = {
    storage: {
      load() { return saved; },
      save() {},
      clear() {}
    },
    loadPrefs() { return { reminderTime: "", hasSeenIntro: true }; },
    syncPrefs() {},
    persist() {},
    toast() {},
    resetS1() {},
    showScreen() {},
    qAll() { return []; },
    $() { return null; }
  };
  const window = { App, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} } };
  window.window = window;
  vm.runInNewContext(stateSource, { window, Date, clearTimeout, setTimeout }, { filename: "app/js/state.js" });
  vm.runInNewContext(screensSource, { window, document: {}, Date, console, setTimeout }, { filename: "app/js/screens.js" });
  return window.App;
}

function dateKey(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

test("旧形式と壊れた履歴を安全に復元する", () => {
  const oldApp = createApp({ records: { todayDone: false, weekRating: "ふつう" } });
  oldApp.restore();
  assert.deepEqual(Array.from(oldApp.state.records.doneDates), []);
  assert.equal(oldApp.state.records.lastDoneAt, null);

  const oldDoneApp = createApp({ records: { todayDone: true, weekRating: "よい" } });
  oldDoneApp.restore();
  assert.deepEqual(Array.from(oldDoneApp.state.records.doneDates), []);
  assert.equal(oldDoneApp.state.records.lastDoneAt, null);

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 3);
  const validDate = dateKey(pastDate);
  const app = createApp({
    records: {
      todayDone: false,
      doneDates: [validDate, validDate, "invalid", "2026-02-30", "2099-01-01"],
      lastDoneAt: "2099-01-01"
    }
  });
  app.restore();
  assert.deepEqual(Array.from(app.state.records.doneDates), [validDate]);
  assert.equal(app.state.records.lastDoneAt, validDate);
});

test("同日のオン・オフは履歴と最終日を決定的に同期する", () => {
  const app = createApp();
  app.syncTodayRecord(true, "2026-08-31");
  app.syncTodayRecord(true, "2026-08-31");
  assert.deepEqual(Array.from(app.state.records.doneDates), ["2026-08-31"]);
  assert.equal(app.state.records.lastDoneAt, "2026-08-31");

  app.syncTodayRecord(false, "2026-08-31");
  assert.deepEqual(Array.from(app.state.records.doneDates), []);
  assert.equal(app.state.records.lastDoneAt, null);
});

test("S4累計の0日・通常・3日以上後の復帰コピーを選ぶ", () => {
  const app = createApp();
  const empty = app.summarizeRecords({ doneDates: [], lastDoneAt: null }, "2026-08-31");
  assert.equal(app.recordTotalCopy(empty), "記録はこれから。できた日がここにたまっていきます");

  const recent = app.summarizeRecords({ doneDates: ["2026-08-30"], lastDoneAt: "2026-08-30" }, "2026-08-31");
  assert.equal(app.recordTotalCopy(recent), "これまでに 1 日できました");

  const returning = app.summarizeRecords({ doneDates: ["2026-08-28"], lastDoneAt: "2026-08-28" }, "2026-08-31");
  const copy = app.recordTotalCopy(returning);
  assert.equal(copy, "おかえりなさい。これまでの 1 日はそのままです");
  assert.doesNotMatch(copy, /連続|途切れ|リセット|あと.*日/);
});

test("全削除は累計履歴も初期化する", () => {
  const app = createApp();
  app.state.records = { todayDone: true, weekRating: "ふつう", doneDates: ["2026-08-31"], lastDoneAt: "2026-08-31" };
  app.clearLocalData();
  assert.deepEqual(Array.from(app.state.records.doneDates), []);
  assert.equal(app.state.records.lastDoneAt, null);
});
