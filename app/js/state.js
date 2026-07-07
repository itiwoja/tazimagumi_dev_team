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
    completed: false,
    // 継続記録(S4)の最小データ。本実装(feature/sc04-record-ui)で拡張予定。
    records: { todayDone: false, weekRating: null }
  };

  /* =====================================================================
     永続化（Issue #58 [提案-F1]）
     - 保存は storage.js（localStorage ラッパ）に委譲。
     - persist は連続呼び出しをまとめる（デバウンス）。確実に書きたい時は
       persist(true) で即時フラッシュする（pagehide 等）。
     ===================================================================== */
  var persistTimer = null;

  App.persist = function (immediate) {
    if (!App.storage) return;
    if (immediate) {
      if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
      App.storage.save(App.state);
      return;
    }
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(function () {
      persistTimer = null;
      App.storage.save(App.state);
    }, 150);
  };

  /** 保存を消して state を初期化（[提案-S2] 全削除の土台）。 */
  App.clearSaved = function () {
    if (App.storage) App.storage.clear();
  };

  /**
   * 保存済み state を現在の state に安全にマージする。
   * 形式が壊れている項目は無視して初期値のまま残す（前方互換）。
   * @returns {boolean} 復元すべき保存データがあれば true
   */
  App.restore = function () {
    if (!App.storage) return false;
    var saved = App.storage.load();
    if (!saved) return false;

    var s = App.state;

    // answers: 長さと要素型を検証（想定外データは捨てる）
    if (Array.isArray(saved.answers) && saved.answers.length === App.S1_TOTAL) {
      s.answers = saved.answers.map(function (a) {
        return typeof a === "string" ? a : null;
      });
    }

    if (typeof saved.qIndex === "number" &&
        saved.qIndex >= 0 && saved.qIndex < App.S1_TOTAL) {
      s.qIndex = saved.qIndex;
    }

    s.completed = saved.completed === true;

    if (App.SCREENS.indexOf(saved.current) !== -1) {
      s.current = saved.current;
    }
    // 未完了なのに s2〜s4 が保存されていたら s1 に戻す（不整合ガード）
    if (!s.completed && s.current !== "s1") s.current = "s1";

    if (saved.records && typeof saved.records === "object") {
      s.records = {
        todayDone: saved.records.todayDone === true,
        weekRating: typeof saved.records.weekRating === "string"
          ? saved.records.weekRating : null
      };
    }

    return true;
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
