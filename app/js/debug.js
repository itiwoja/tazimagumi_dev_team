/* =====================================================================
   デモ用シードデータ注入（Issue #113 / #76 デバッグモードの拡張）
   ---------------------------------------------------------------------
   - ?debug=demo : 約3週間分のデモ記録データ＋診断済み状態を localStorage に
                   一括投入する。本番利用者が誤って踏まないよう、注入前に
                   confirm を挟む（キャンセルなら何もしない）。
   - ?debug=reset: 保存データを全消去して「初回体験」のデモに即切替する。
                   こちらもデータ破壊のため confirm を挟む。
   - どちらも処理後は URL から debug パラメータを外す（F5 で confirm が
     再発火しないように）。再注入したい時は URL を打ち直す。
   - main.js の初期化（App.restore）より前に localStorage を書き換える
     必要があるため、読み込み順は screens.js の後・main.js の前で固定。
   - コンソールから App.debugSeedDemo() でも注入できる（confirm なし）。
     初期化後に呼んだ場合は、リロードすると注入後の画面になる。
   - ?debug=1（全画面解放・main.js）とは独立。詳細は Issue #76 / #113。
   ===================================================================== */
(function (global) {
  "use strict";

  var App = global.App;

  /* ---- シードデータ設計（発表で見せたいストーリー）----
     「序盤はサボり気味 → 後半は毎日続く。自己評価も段階的に上がる」
     という3週間の物語を固定パターンで注入する（乱数を使わず、いつ
     実行しても同じ見え方＝発表で再現可能）。#89 の相関表示が映える形。
     pattern は週の1日目→7日目の記録有無。最終週の7日目が「今日」。 */
  var DEMO_WEEKS = [
    { pattern: [1, 0, 1, 0, 0, 1, 0], rating: "ちょっと荒れた" }, // 3週間前: 3/7日
    { pattern: [1, 1, 0, 1, 1, 0, 1], rating: "ふつう" },         // 2週間前: 5/7日
    { pattern: [1, 1, 1, 0, 1, 1, 1], rating: "いい感じ" }        // 今週:     6/7日
  ];

  // S1 各質問のチップ表示ラベル（app/index.html）と一致させること。
  // ずれると復元時にチップが選択状態にならない。
  var DEMO_ANSWERS = [
    "テカリ・ベタつき",   // Q1 肌の悩み
    "とくに問題ない",     // Q2 髭剃り後
    "ペタッとする",       // Q3 髪
    "〜1,500円",          // Q4 予算
    "朝も夜もいける"      // Q5 続けられそうな時間帯
  ];

  /** ローカル時刻の YYYY-MM-DD（デモは端末の「今日」を最終日に組み立てる）。 */
  function toDateKey(d) {
    var y = d.getFullYear();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    return y + "-" + m + "-" + day;
  }

  /**
   * 今日を最終日とする3週間分のデモ記録を組み立てる。
   * @param {Date} today 基準日（この日が days の最終要素になる）
   * @returns {{days: Array<{date: string, done: boolean}>,
   *            weeks: Array<{weekStart: string, rating: string}>}}
   */
  function buildDemoLog(today) {
    var days = [];
    var weeks = [];
    var total = DEMO_WEEKS.length * 7;
    DEMO_WEEKS.forEach(function (week, w) {
      var weekStart = null;
      for (var i = 0; i < 7; i++) {
        var daysAgo = total - 1 - (w * 7 + i);
        var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo);
        var key = toDateKey(d);
        if (i === 0) weekStart = key;
        days.push({ date: key, done: week.pattern[i] === 1 });
      }
      weeks.push({ weekStart: weekStart, rating: week.rating });
    });
    return { days: days, weeks: weeks };
  }

  /**
   * デモ用シードデータを localStorage に一括投入する（Issue #113）。
   * - 本体 state（midashinami:v1）: 診断済み・回答5問・S4表示・今日記録済み。
   *   保存形式は storage.js に委譲するので、スキーマ版の追従は自動。
   * - continuity_log: 3週間分の日次記録＋週次自己評価の履歴。
   *   ※消費側（SC-04 / #62 / #88）は未実装のため、v とデモ目印付きの
   *     暫定形式。SC-04 実装時に形式を確定させること。
   * @returns {boolean} 投入できたら true
   */
  App.debugSeedDemo = function () {
    if (!App.storage || !App.storage.canPersist) {
      App.toast("この環境では保存できないため、デモデータを注入できません");
      return false;
    }

    // answers は必ず S1_TOTAL 長にそろえる（将来 S1 の問数が変わっても
    // App.restore の長さ検証でシード全体が捨てられないように）
    var answers = new Array(App.S1_TOTAL).fill(null);
    DEMO_ANSWERS.forEach(function (a, i) {
      if (i < answers.length) answers[i] = a;
    });

    var lastWeek = DEMO_WEEKS[DEMO_WEEKS.length - 1];
    var seededState = {
      current: "s4",              // 「3週間使い込んだ状態」の見せ場＝継続記録から開く
      qIndex: App.S1_TOTAL - 1,
      answers: answers,
      completed: true,
      records: {
        todayDone: lastWeek.pattern[6] === 1,
        weekRating: lastWeek.rating
      }
    };
    if (!App.storage.save(seededState)) {
      App.toast("デモデータの保存に失敗しました");
      return false;
    }

    // メモリ上の state も同期させる（in-place。screens/main が閉じ込めた参照を保つ）。
    // これが無いと、初期化後にコンソールから注入 → リロードした時に
    // pagehide の即時保存（main.js）が古い state でシードを上書きしてしまう。
    var s = App.state;
    s.current = seededState.current;
    s.qIndex = seededState.qIndex;
    s.answers = seededState.answers.slice();
    s.completed = seededState.completed;
    s.records.todayDone = seededState.records.todayDone;
    s.records.weekRating = seededState.records.weekRating;

    var log = buildDemoLog(new Date());
    try {
      global.localStorage.setItem(App.LOCAL_KEYS.continuity, JSON.stringify({
        v: 1,
        source: "debug-demo",     // デモ注入データの目印（実データと区別する用）
        days: log.days,
        weeks: log.weeks
      }));
    } catch (e) {
      // continuity_log は将来の SC-04 用。書けなくても本体のデモは成立する
    }
    return true;
  };

  /* ---- URLパラメータの処理（App.restore より前・スクリプト読込時に実行）---- */

  /** debug=demo / debug=reset だけを URL から外す（?debug=1 や他のパラメータ、
      ハッシュは保持する）。main.js の App.isDebug はこの後に評価されるため、
      ?debug=1&debug=demo の併用でも全画面解放は生きる。 */
  function stripDebugParam() {
    try {
      var url = new URL(global.location.href);
      var keep = url.searchParams.getAll("debug").filter(function (v) {
        return v !== "demo" && v !== "reset";
      });
      url.searchParams.delete("debug");
      keep.forEach(function (v) { url.searchParams.append("debug", v); });
      global.history.replaceState(null, "", url.pathname + url.search + url.hash);
    } catch (e) {
      // URL API 非対応や file:// 直開き（replaceState が SecurityError）では
      // 何もしない（F5 で confirm が再度出るだけで、実害はない）
    }
  }

  /**
   * 保存データを全消去する（?debug=reset）。
   * App.clearLocalData（設定画面の全削除）と同じキーを消すが、あちらは
   * 画面リセットまで行うため main.js 初期化前には呼べない（App.setBackVisible
   * 未定義で落ちる）。ここではデータ消去のみ行い、直後の通常初期化に
   * 初回状態で立ち上がらせる。消すキーは App.LOCAL_KEYS と storage 本体で、
   * clearLocalData と対で保守すること。
   */
  function wipeForFirstRunDemo() {
    if (App.storage) App.storage.clear();
    Object.keys(App.LOCAL_KEYS).forEach(function (name) {
      try { global.localStorage.removeItem(App.LOCAL_KEYS[name]); } catch (e) {}
    });
    App.prefs = { reminderTime: "", hasSeenIntro: false };
  }

  var match = /[?&]debug=(demo|reset)(?:&|$)/.exec(global.location.search);
  if (!match) return;

  if (match[1] === "demo") {
    if (global.confirm(
      "【デバッグ】デモ用データ（約3週間分の記録＋診断済み状態）を注入します。\n" +
      "現在の保存データは上書きされます。よろしいですか？"
    )) {
      if (App.debugSeedDemo()) App.toast("デモデータを注入しました");
    }
  } else if (global.confirm(
    "【デバッグ】保存データをすべて削除して初回状態に戻します。よろしいですか？"
  )) {
    wipeForFirstRunDemo();
    App.toast("保存データを削除しました（初回状態）");
  }
  stripDebugParam();
})(window);
