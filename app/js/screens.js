/* =====================================================================
   画面ロジック（S1ウィザード / S2-S4） — 画面担当の作業場所
   担当タスク:
     [F-01] 初回チェック（S1ウィザード）
     [F-02] ロードマップ（S2）
     [F-03/04/05] 商品候補・比較（S3）  ← data/products.js を使う
     [F-06] 継続記録（S4）
   ---------------------------------------------------------------------
   - 共有状態は window.App（state.js）から読む。
   - 画面ごとに関数が分かれているので、担当画面の関数だけ触ればOK。
   ===================================================================== */
(function (global) {
  "use strict";

  var App = global.App;
  var $ = App.$, qAll = App.qAll, state = App.state;

  App.prefs = App.loadPrefs();

  /* =================== [F-01] S1 初回チェック ウィザード =================== */
  function currentQCard() {
    return $("qstack").querySelector('.qcard[data-q="' + state.qIndex + '"]');
  }

  function remainCopy() {
    var remain = App.S1_TOTAL - App.answeredCount();
    return remain > 0
      ? "あと " + remain + " 問・むずかしい言葉は出てきません"
      : "ぜんぶ選べました。プランを見てみましょう";
  }

  App.renderQuestion = function () {
    qAll(".qcard", $("qstack")).forEach(function (c) {
      c.hidden = Number(c.getAttribute("data-q")) !== state.qIndex;
    });
    var remainEl = $("s1Remain");
    if (remainEl) remainEl.textContent = remainCopy();
    App.setBackVisible(state.qIndex > 0);
    App.syncCTA();
  };

  App.syncCTA = function () {
    var c = $("cta");
    if (state.current !== "s1") return;
    var answered = state.answers[state.qIndex] !== null;
    var isLast = state.qIndex === App.S1_TOTAL - 1;
    c.textContent = isLast ? "プランを見る" : "次へ";
    c.disabled = !answered;
  };

  App.pick = function (chip) {
    var card = currentQCard();
    qAll(".chip", card).forEach(function (ch) { ch.setAttribute("aria-checked", "false"); });
    chip.setAttribute("aria-checked", "true");
    state.answers[state.qIndex] = chip.querySelector(".chip__label").textContent.trim();
    App.updateProgress();
    var remainEl = $("s1Remain");
    if (remainEl) remainEl.textContent = remainCopy();
    App.syncCTA();
  };

  App.nextQuestion = function () {
    if (state.answers[state.qIndex] === null) return;
    if (state.qIndex < App.S1_TOTAL - 1) {
      var half = Math.ceil(App.S1_TOTAL / 2);
      var crossedHalf = App.answeredCount() >= half && state.qIndex + 1 === half;
      state.qIndex++;
      App.renderQuestion();
      $("qstack").scrollIntoView({ block: "nearest" });
      if (crossedHalf) App.toast("ここまでで半分。いいペースです");
    } else {
      App.complete();
    }
  };

  App.prevQuestion = function () {
    if (state.qIndex > 0) { state.qIndex--; App.renderQuestion(); }
  };

  /* =================== 完了 / 画面遷移 =================== */
  App.complete = function () {
    if (!state.completed) {
      state.completed = true;
      qAll(".tab").forEach(function (t) {
        t.classList.remove("is-locked");
        t.removeAttribute("aria-disabled");
        if (t.getAttribute("data-go") === "s1") t.classList.add("is-done");
      });
      App.toast("あなた専用の3ステップができました");
    }
    App.showScreen("s2");
  };

  App.showScreen = function (id) {
    state.current = id;
    App.SCREENS.forEach(function (s) { $(s).hidden = s !== id; });
    qAll(".tab").forEach(function (t) {
      var on = t.getAttribute("data-go") === id;
      t.classList.toggle("is-active", on);
      if (on) t.setAttribute("aria-current", "step"); else t.removeAttribute("aria-current");
    });
    var label = $("stepLabel");
    if (label) label.textContent = App.STEP_LABEL[id];

    $("cta").disabled = false;
    if (id === "s1") { App.renderQuestion(); }
    else { $("cta").textContent = App.CTA_LABEL[id]; }
    App.setBackVisible(id === "s1" && state.qIndex > 0);

    App.updateProgress();
    var wrap = $("screenWrap");
    if (wrap) wrap.scrollTop = 0;
  };

  App.resetS1 = function () {
    state.qIndex = 0;
    state.answers = new Array(App.S1_TOTAL).fill(null);
    state.completed = false;
    App.updateProgress();
    qAll(".chip", $("qstack")).forEach(function (ch) { ch.setAttribute("aria-checked", "false"); });
    qAll(".tab").forEach(function (t) {
      var go = t.getAttribute("data-go");
      t.classList.remove("is-done");
      if (go !== "s1") { t.classList.add("is-locked"); t.setAttribute("aria-disabled", "true"); }
    });
    App.renderQuestion();
  };

  App.saveReminderTime = function (time) {
    var nextTime = typeof time === "string" ? time.trim() : "";
    App.prefs = { reminderTime: nextTime };
    App.syncPrefs();
    var input = $("reminderTime");
    if (input && input.value !== nextTime) input.value = nextTime;
    App.toast(nextTime ? "リマインド時刻を保存しました" : "リマインド時刻を空にしました");
    return App.prefs;
  };

  App.clearLocalData = function () {
    // 本体の永続化データ（midashinami:v1）は storage 層の clear で消す。
    // 直後の resetS1/showScreen の自動保存で初期状態が再保存されるが、
    // 個人データは含まれない
    if (App.storage) App.storage.clear();
    var keys = App.LOCAL_KEYS;
    [keys.answers, keys.result, keys.continuity, keys.prefs].forEach(function (key) {
      try { global.localStorage.removeItem(key); } catch (error) {}
    });
    App.prefs = { reminderTime: "" };
    App.resetS1();
    App.showScreen("s1");
    App.toast("保存データを削除しました");
  };

  /* =================== [F-03/04/05] S3 商品候補（データ駆動の予算カウント） =================== */
  /* 候補リスト/比較表の本格描画は担当タスクで data/products.js を使って実装する。
     ここでは土台として「予算帯の件数表示」だけデータ連動させてある。 */
  App.updateBudgetCount = function (budget) {
    var numEl = $("budgetNum");
    if (!numEl || typeof global.filterProductsByBudget !== "function") return;
    numEl.textContent = String(global.filterProductsByBudget(budget).length);
  };
})(window);
