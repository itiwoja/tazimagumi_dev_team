/* =====================================================================
   起動・イベント配線 — エントリポイント
   担当タスク: [CORE] アプリ基盤（基本このファイルは触らない）
   ---------------------------------------------------------------------
   読み込み順（index.html）:
     1) data/products.js  2) js/state.js  3) js/screens.js  4) js/main.js
   ===================================================================== */
(function (global) {
  "use strict";

  var App = global.App;
  var $ = App.$, qAll = App.qAll, state = App.state;

  /* ---- back ボタン（S1用・dock に差し込む） ---- */
  var dock = document.querySelector(".dock");
  var cta = $("cta");
  var backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "cta-back";
  backBtn.setAttribute("aria-label", "ひとつ前の質問にもどる");
  backBtn.textContent = "←";
  backBtn.style.cssText =
    "flex:0 0 auto;width:52px;height:50px;border-radius:14px;border:1px solid var(--border);" +
    "background:var(--surface);color:var(--text);font-size:20px;font-weight:700;cursor:pointer;display:none;touch-action:manipulation";
  dock.insertBefore(backBtn, cta);

  App.setBackVisible = function (visible) {
    backBtn.style.display = visible ? "block" : "none";
  };

  /* ---- CTA ---- */
  function ctaClick() {
    switch (state.current) {
      case "s1": App.nextQuestion(); break;
      case "s2": App.showScreen("s3"); break;
      case "s3": App.showScreen("s4"); break;
      case "s4": App.resetS1(); App.showScreen("s1"); break;
    }
  }
  cta.addEventListener("click", ctaClick);
  backBtn.addEventListener("click", function () { App.prevQuestion(); });

  /* ---- chips（イベント委譲） ---- */
  $("qstack").addEventListener("click", function (e) {
    var chip = e.target.closest("[data-pick]");
    if (chip) App.pick(chip);
  });

  /* ---- tabs ---- */
  qAll(".tab").forEach(function (t) {
    if (!t.hasAttribute("type")) t.setAttribute("type", "button");
    t.addEventListener("click", function () {
      var go = t.getAttribute("data-go");
      if (go === "s1" || state.completed) { App.showScreen(go); }
      else { App.toast("初回チェック（5問）を終えると開きます"); }
    });
  });

  /* ---- 用語シート（S2 の「○○ってなに？」） ---- */
  var TERMS = {
    "化粧水": {
      t: "化粧水ってなに？",
      b: "洗ったあとの肌に、水分を足すための液です。化粧というより「肌の水やり」と思えばOK。むずかしく考えなくて大丈夫です。"
    }
    // [F-02] 用語を増やす場合はここに追加
  };
  function openSheet(key) {
    var data = TERMS[key]; if (!data) return;
    $("sheetTitle").textContent = data.t;
    $("sheetBody").textContent = data.b;
    $("sheet").hidden = false;
    $("sheetClose").focus();
  }
  function closeSheet() { $("sheet").hidden = true; }

  $("s2").addEventListener("click", function (e) {
    var b = e.target.closest(".term");
    if (b) openSheet(b.getAttribute("data-term"));
  });
  $("sheetClose").addEventListener("click", closeSheet);
  $("sheetScrim").addEventListener("click", closeSheet);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

  /* ---- [F-03] 予算トグル（件数はデータ連動） ---- */
  qAll(".budget__btn").forEach(function (b) {
    b.addEventListener("click", function () {
      qAll(".budget__btn").forEach(function (x) {
        x.classList.remove("is-on"); x.setAttribute("aria-pressed", "false");
      });
      b.classList.add("is-on"); b.setAttribute("aria-pressed", "true");
      var key = b.getAttribute("data-budget");
      App.updateBudgetCount(key);
      if (key === "sub") App.toast("まず1本だけ。これで十分はじめられます");
    });
  });

  /* ---- [F-06] 今日のドット（state.records に保存） ---- */
  var dot = $("todayDot");
  if (dot) dot.addEventListener("click", function () {
    var on = dot.getAttribute("aria-pressed") === "true";
    var next = !on;
    dot.setAttribute("aria-pressed", next ? "true" : "false");
    state.records.todayDone = next;
    if (next) App.toast("今日ぶん、記録できました");
    App.persist();
  });

  /* ---- [F-06] 今週の自己評価（単一選択・state.records に保存） ---- */
  qAll(".rate").forEach(function (r) {
    r.addEventListener("click", function () {
      qAll(".rate").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      r.setAttribute("aria-pressed", "true");
      state.records.weekRating = r.textContent.trim();
      App.persist();
    });
  });

  /* ---- 設定ボタン（基盤・最小実装：詳細な設定画面は今後 feature で拡張） ---- */
  var settingsBtn = $("settingsBtn");
  if (settingsBtn) settingsBtn.addEventListener("click", function () {
    App.toast("設定はこれから追加します");
  });

  /* ===================================================================
     永続化ブートストラップ（Issue #58 [提案-F1]）
     - 状態を変える基盤関数を main 側でラップし、自動保存を差し込む。
       → 画面担当の screens.js を書き換えずに済む（コンフリクト回避）。
     =================================================================== */
  function withAutosave(name) {
    var orig = App[name];
    if (typeof orig !== "function") return;
    App[name] = function () {
      var r = orig.apply(this, arguments);
      App.persist();
      return r;
    };
  }
  ["pick", "nextQuestion", "prevQuestion", "complete", "showScreen", "resetS1"]
    .forEach(withAutosave);

  // リロード/離脱時に取りこぼしなく即時保存
  global.addEventListener("pagehide", function () { App.persist(true); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") App.persist(true);
  });

  /* ---- 保存済み回答をチップ選択状態へ反映 ---- */
  function restoreChips() {
    qAll(".qcard", $("qstack")).forEach(function (card) {
      var qi = Number(card.getAttribute("data-q"));
      var answer = state.answers[qi];
      if (answer == null) return;
      qAll(".chip", card).forEach(function (chip) {
        var label = chip.querySelector(".chip__label");
        var picked = !!label && label.textContent.trim() === answer;
        chip.setAttribute("aria-checked", picked ? "true" : "false");
      });
    });
  }

  /* ---- S4 の記録UIを保存値から復元 ---- */
  function restoreRecords() {
    if (dot) dot.setAttribute("aria-pressed", state.records.todayDone ? "true" : "false");
    qAll(".rate").forEach(function (r) {
      var on = r.textContent.trim() === state.records.weekRating;
      r.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  /* ---- init ---- */
  var restored = App.restore();

  if (restored) {
    restoreChips();
    restoreRecords();
    if (state.completed) {
      // 完了済み: タブ解放（App.complete と同等）＋保存画面を復元
      qAll(".tab").forEach(function (t) {
        t.classList.remove("is-locked");
        t.removeAttribute("aria-disabled");
        if (t.getAttribute("data-go") === "s1") t.classList.add("is-done");
      });
      App.showScreen(state.current);
    } else {
      App.renderQuestion();
    }
  } else {
    App.renderQuestion();
  }

  App.updateProgress();
  App.updateBudgetCount("core");
})(window);
