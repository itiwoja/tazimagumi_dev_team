/* =====================================================================
   アプリ状態 + 進捗 — 全画面の土台（共有モジュール）
   担当タスク: [CORE] アプリ基盤・状態管理（基本このファイルは触らない）
   ---------------------------------------------------------------------
   - window.App 名前空間に state とユーティリティをぶら下げる（ビルド不要）。
   - 画面追加・データ整備の担当は、ここを読むだけでOK（書き換え原則禁止）。
   ===================================================================== */
(function (global) {
  "use strict";

  var App = global.App || (global.App = {});

  App.S1_TOTAL = 5;
  App.SCREENS = ["s1", "s2", "s3", "s4"];
  App.STEP_LABEL = { s1: "初回チェック", s2: "ロードマップ", s3: "商品をくらべる", s4: "継続記録" };
  App.CTA_LABEL = {
    s2: "具体的な商品の候補を見る",
    s3: "このまま記録を始める",
    s4: "もう一度はじめから見る"
  };

  App.state = {
    current: "s1",
    qIndex: 0,
    answers: new Array(App.S1_TOTAL).fill(null),
    completed: false
  };

  /* ---- DOM ヘルパ ---- */
  App.$ = function (id) { return document.getElementById(id); };
  App.qAll = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  App.answeredCount = function () {
    var n = 0, a = App.state.answers;
    for (var i = 0; i < a.length; i++) if (a[i] !== null) n++;
    return n;
  };

  /* ---- progress ---- */
  App.updateProgress = function () {
    var p;
    if (!App.state.completed) {
      p = 0.04 + 0.21 * (App.answeredCount() / App.S1_TOTAL);
    } else {
      p = (App.SCREENS.indexOf(App.state.current) + 1) / App.SCREENS.length;
    }
    if (p > 1) p = 1;
    var fill = App.$("progressFill");
    var bar = App.$("progressBar");
    if (fill) fill.style.setProperty("--p", p.toFixed(3));
    if (bar) bar.setAttribute("aria-valuenow", String(Math.round(p * 100)));
  };

  /* ---- toast ---- */
  var toastTimer = null;
  App.toast = function (msg) {
    var t = App.$("toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    void t.offsetWidth; // reflow → transition 発火
    t.classList.add("is-show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove("is-show");
      setTimeout(function () { t.hidden = true; }, 220);
    }, 1900);
  };
})(window);
