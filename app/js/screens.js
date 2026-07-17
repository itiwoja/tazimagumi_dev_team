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

  /* =================== [F-02] S2 ロードマップ動的描画 =================== */
  App.renderRoadmap = function () {
    var diagnosis = App.diagnose(state.answers);
    var steps = App.buildRoadmap(diagnosis);
    var meta = App.TYPE_META[diagnosis.primaryType];
    var typeLabel = $("s2ResultType");
    var todayCopy = $("s2TodayCopy");
    var roadmapLabel = $("s2RoadmapLabel");
    var roadmapList = $("roadmapList");

    if (!roadmapList || !meta || !Array.isArray(steps) || steps.length === 0) return;

    if (typeLabel) typeLabel.textContent = "あなた向けの「" + meta.name + "」プラン";
    if (todayCopy) {
      todayCopy.textContent = steps[0].body + " ";
      var todayEnd = document.createElement("b");
      todayEnd.textContent = "今日はここまで。";
      todayCopy.appendChild(todayEnd);
    }
    if (roadmapLabel) roadmapLabel.textContent = steps.length + "ステップ";

    roadmapList.textContent = "";
    steps.forEach(function (step) {
      var item = document.createElement("li");
      item.className = "card road__item";

      var badge = document.createElement("span");
      badge.className = "step-badge";
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = String(step.order);

      var body = document.createElement("div");
      body.className = "road__body";

      var title = document.createElement("h3");
      title.className = "road__t";
      title.textContent = step.title;
      body.appendChild(title);

      var description = document.createElement("p");
      description.className = "road__desc";
      description.textContent = step.body;
      body.appendChild(description);

      if (step.term) {
        var term = document.createElement("span");
        term.className = "pill";
        term.textContent = step.term;
        body.appendChild(term);
      }

      item.appendChild(badge);
      item.appendChild(body);
      roadmapList.appendChild(item);
    });
  };

  /* =================== 完了 / 画面遷移 =================== */
  App.complete = function () {
    if (!state.completed) {
      state.completed = true;
      
      // 診断とロードマップ生成を実行して状態に保存
      try {
        state.diagnosis = App.diagnose(state.answers);
        state.roadmap = App.buildRoadmap(state.diagnosis);
      } catch (error) {
        console.error("診断またはロードマップ生成に失敗しました:", error);
      }

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
    else {
      if (id === "s2") App.renderRoadmap();
      $("cta").textContent = App.CTA_LABEL[id];
    }
    App.setBackVisible(id === "s1" && state.qIndex > 0);

    App.updateProgress();
    var wrap = $("screenWrap");
    if (wrap) wrap.scrollTop = 0;
  };

  App.resetS1 = function () {
    state.qIndex = 0;
    state.answers = new Array(App.S1_TOTAL).fill(null);
    state.completed = false;
    state.diagnosis = null;
    state.roadmap = null;
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

  /**
   * 記録データを JSON ファイルとして書き出す（[提案-S2] エクスポート / Issue #85）。
   * 保存層(storage.js)の生 state をそのまま出すので、将来インポートを作る際も復元互換。
   */
  App.exportData = function () {
    var saved = (App.storage && App.storage.load) ? App.storage.load() : null;
    var payload = { v: 1, exportedAt: Date.now(), state: saved || App.state };
    var url = null;
    try {
      var blob = new global.Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      url = global.URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "midashinami-backup.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      App.toast("データを書き出しました");
    } catch (error) {
      App.toast("書き出しに失敗しました");
    } finally {
      if (url) setTimeout(function () { global.URL.revokeObjectURL(url); }, 0);
    }
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
    // メモリ上の記録も初期化してから resetS1/showScreen（autosaveラップ対象）を呼ぶ。
    // 先に消さないと、直後の自動保存で records が midashinami:v1 に書き戻される（Issue #119）。
    state.records.todayDone = false;
    state.records.weekRating = null;
    if (typeof App.repaintRecords === "function") App.repaintRecords();
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
