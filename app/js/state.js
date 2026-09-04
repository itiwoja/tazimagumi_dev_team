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
    // 初回チェックの入口で選んだカテゴリ（skin / shave / hair）。
    // 旧保存データには存在しないため、未設定は肌カテゴリに決め打ちせず null とする。
    focusCategory: null,
    answers: new Array(App.S1_TOTAL).fill(null),
    completed: false,
    diagnosis: null,
    roadmap: null,
    // 継続記録(S4)。doneDates はローカル暦日の重複なし履歴で、累計の唯一の元データ。
    records: { todayDone: false, weekRating: null, doneDates: [], lastDoneAt: null }
  };

  /** Date を端末ローカルの YYYY-MM-DD キーへ変換する。 */
  App.toLocalDateKey = function (date) {
    var d = date instanceof Date ? date : new Date();
    var y = d.getFullYear();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    return y + "-" + m + "-" + day;
  };

  function isDateKey(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parts = value.split("-");
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return date.getFullYear() === Number(parts[0]) &&
      date.getMonth() === Number(parts[1]) - 1 &&
      date.getDate() === Number(parts[2]);
  }

  /**
   * records を表示・保存可能な最小スキーマへ正規化する。
   * lastDoneAt は doneDates から導くため、削除済みの日付が残らない。
   */
  App.normalizeRecords = function (records, today) {
    var source = records && typeof records === "object" ? records : {};
    var todayKey = isDateKey(today) ? today : App.toLocalDateKey(new Date());
    var seen = {};
    var doneDates = Array.isArray(source.doneDates) ? source.doneDates.filter(function (date) {
      if (!isDateKey(date) || date > todayKey || seen[date]) return false;
      seen[date] = true;
      return true;
    }).sort() : [];

    return {
      todayDone: doneDates.indexOf(todayKey) !== -1,
      weekRating: typeof source.weekRating === "string" ? source.weekRating : null,
      doneDates: doneDates,
      lastDoneAt: doneDates.length ? doneDates[doneDates.length - 1] : null
    };
  };

  /** 今日の完了トグルと履歴を同じローカル日付キーで同期する。 */
  App.syncTodayRecord = function (done, today) {
    var todayKey = isDateKey(today) ? today : App.toLocalDateKey(new Date());
    var records = App.normalizeRecords(App.state.records, todayKey);
    var dates = records.doneDates.filter(function (date) { return date !== todayKey; });
    if (done === true) dates.push(todayKey);
    dates.sort();

    App.state.records.todayDone = done === true;
    App.state.records.weekRating = records.weekRating;
    App.state.records.doneDates = dates;
    App.state.records.lastDoneAt = dates.length ? dates[dates.length - 1] : null;
    return App.state.records;
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

    if (typeof saved.focusCategory === "string" &&
        ["skin", "shave", "hair"].indexOf(saved.focusCategory) !== -1) {
      s.focusCategory = saved.focusCategory;
    }

    s.completed = saved.completed === true;

    if (App.SCREENS.indexOf(saved.current) !== -1) {
      s.current = saved.current;
    }
    // 未完了なのに s2〜s4 が保存されていたら s1 に戻す（不整合ガード）
    if (!s.completed && s.current !== "s1") s.current = "s1";

    if (saved.diagnosis && typeof saved.diagnosis === "object") {
      s.diagnosis = saved.diagnosis;
    }
    if (Array.isArray(saved.roadmap)) {
      s.roadmap = saved.roadmap;
    }

    if (saved.records && typeof saved.records === "object") {
      s.records = App.normalizeRecords(saved.records);
    }

    return true;
  };

  // GitHub Pages は <user>.github.io 配下の全リポジトリで localStorage を
  // 共有するため、実際に読み書きするキーは "midashinami:" で名前空間を切る
  App.LOCAL_KEYS = {
    answers: "diagnosis_answers",
    result: "diagnosis_result",
    continuity: "continuity_log",
    prefs: "midashinami:prefs:v1"
  };

  App.prefs = {
    reminderTime: "",
    // SC-00 導入画面を見たか（設計書 SC-00 v0.1 §4。初回のみ表示の判定に使う）
    hasSeenIntro: false,
    // 設定でユーザー自身が選んだ、候補から外したい成分タグ名。
    avoidedIngredients: []
  };

  /** 保存値・UI入力のどちらにも使う、成分タグ名配列の後方互換ガード。 */
  App.normalizeAvoidedIngredients = function (value) {
    if (!Array.isArray(value)) return [];
    return value.reduce(function (names, name) {
      var normalized = typeof name === "string" ? name.trim() : "";
      if (normalized && names.indexOf(normalized) === -1) names.push(normalized);
      return names;
    }, []);
  };

  App.loadPrefs = function () {
    try {
      var raw = global.localStorage.getItem(App.LOCAL_KEYS.prefs);
      if (!raw) return App.prefs;
      var parsed = JSON.parse(raw);
      return {
        reminderTime: typeof parsed.reminderTime === "string" ? parsed.reminderTime : "",
        // 型ガード: 壊れた値・旧形式は初期値(false)のまま扱う（設計書 SC-00 §4）
        hasSeenIntro: typeof parsed.hasSeenIntro === "boolean" ? parsed.hasSeenIntro : false,
        avoidedIngredients: App.normalizeAvoidedIngredients(parsed.avoidedIngredients)
      };
    } catch (error) {
      return App.prefs;
    }
  };

  App.syncPrefs = function () {
    try {
      var prefs = App.prefs && typeof App.prefs === "object" ? App.prefs : {};
      var avoidedIngredients = App.normalizeAvoidedIngredients(prefs.avoidedIngredients);

      // 旧画面の設定保存は avoidedIngredients を持たないオブジェクトを再構成する。
      // その場合だけ既存の保存値を引き継ぎ、チップで空配列を明示した変更は優先する。
      if (!Array.isArray(prefs.avoidedIngredients)) {
        try {
          var raw = global.localStorage.getItem(App.LOCAL_KEYS.prefs);
          var saved = raw ? JSON.parse(raw) : null;
          avoidedIngredients = App.normalizeAvoidedIngredients(saved && saved.avoidedIngredients);
        } catch (error) {
          avoidedIngredients = [];
        }
      }

      App.prefs = {
        reminderTime: typeof prefs.reminderTime === "string" ? prefs.reminderTime : "",
        hasSeenIntro: prefs.hasSeenIntro === true,
        avoidedIngredients: avoidedIngredients
      };
      global.localStorage.setItem(App.LOCAL_KEYS.prefs, JSON.stringify(App.prefs));
    } catch (error) {}
  };

  /* ---- DOM ヘルパ ---- */
  App.$ = function (id) {
    return typeof document !== "undefined" && document && typeof document.getElementById === "function"
      ? document.getElementById(id)
      : null;
  };
  App.qAll = function (sel, root) {
    var target = root || (typeof document !== "undefined" ? document : null);
    return target && typeof target.querySelectorAll === "function"
      ? Array.prototype.slice.call(target.querySelectorAll(sel))
      : [];
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
