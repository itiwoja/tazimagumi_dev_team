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
  backBtn.addEventListener("click", App.prevQuestion);

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

  /* ---- [F-06] 今日のドット ---- */
  var dot = $("todayDot");
  if (dot) dot.addEventListener("click", function () {
    var on = dot.getAttribute("aria-pressed") === "true";
    dot.setAttribute("aria-pressed", on ? "false" : "true");
    if (!on) App.toast("今日ぶん、記録できました");
  });

  /* ---- [F-06] 今週の自己評価（単一選択） ---- */
  qAll(".rate").forEach(function (r) {
    r.addEventListener("click", function () {
      qAll(".rate").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      r.setAttribute("aria-pressed", "true");
    });
  });

  /* ---- 設定ボタン（基盤・最小実装：詳細な設定画面は今後 feature で拡張） ---- */
  var settingsBtn = $("settingsBtn");
  if (settingsBtn) settingsBtn.addEventListener("click", function () {
    App.toast("設定はこれから追加します");
  });

  /* ---- init ---- */
  App.renderQuestion();
  App.updateProgress();
  App.updateBudgetCount("core");
})(window);
