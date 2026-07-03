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

  /* ---- settings sheet ---- */
  var settingsSheet = $("settingsSheet");
  var settingsClose = $("settingsClose");
  var settingsScrim = $("settingsScrim");
  var settingsOpenBtn = $("settingsBtn");
  var reminderTime = $("reminderTime");
  var reminderSaveBtn = $("reminderSaveBtn");
  var resetDiagnosisBtn = $("resetDiagnosisBtn");
  var clearDataBtn = $("clearDataBtn");
  var clearConfirm = $("clearConfirm");
  var clearConfirmBtn = $("clearConfirmBtn");
  var clearCancelBtn = $("clearCancelBtn");
  var settingsLastFocus = null;
  var settingsArmedClear = false;

  function syncReminderField() {
    if (reminderTime) reminderTime.value = App.prefs.reminderTime || "";
  }

  function closeClearConfirm() {
    settingsArmedClear = false;
    if (clearConfirm) clearConfirm.hidden = true;
    if (clearDataBtn) clearDataBtn.disabled = false;
  }

  function openSettingsSheet() {
    settingsLastFocus = document.activeElement;
    syncReminderField();
    closeClearConfirm();
    if (settingsSheet) settingsSheet.hidden = false;
    if (reminderTime) reminderTime.focus();
  }

  function closeSettingsSheet() {
    if (settingsSheet) settingsSheet.hidden = true;
    closeClearConfirm();
    if (settingsLastFocus && typeof settingsLastFocus.focus === "function") settingsLastFocus.focus();
  }

  App.openSettingsSheet = openSettingsSheet;
  App.closeSettingsSheet = closeSettingsSheet;

  function handleSettingsKeydown(e) {
    if (!settingsSheet || settingsSheet.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeSettingsSheet();
      return;
    }
    if (e.key !== "Tab") return;
    var focusables = qAll("button, input", settingsSheet).filter(function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

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

  if (settingsOpenBtn) settingsOpenBtn.addEventListener("click", openSettingsSheet);
  if (settingsClose) settingsClose.addEventListener("click", closeSettingsSheet);
  if (settingsScrim) settingsScrim.addEventListener("click", closeSettingsSheet);
  if (reminderSaveBtn) reminderSaveBtn.addEventListener("click", function () {
    App.saveReminderTime(reminderTime ? reminderTime.value : "");
  });
  if (reminderTime) reminderTime.addEventListener("change", function () {
    App.saveReminderTime(reminderTime.value);
  });
  if (resetDiagnosisBtn) resetDiagnosisBtn.addEventListener("click", function () {
    App.resetS1();
    App.showScreen("s1");
    closeSettingsSheet();
    App.toast("診断をS1からやり直しました");
  });
  if (clearDataBtn) clearDataBtn.addEventListener("click", function () {
    settingsArmedClear = true;
    if (clearConfirm) clearConfirm.hidden = false;
    clearDataBtn.disabled = true;
  });
  if (clearCancelBtn) clearCancelBtn.addEventListener("click", closeClearConfirm);
  if (clearConfirmBtn) clearConfirmBtn.addEventListener("click", function () {
    if (!settingsArmedClear) return;
    closeSettingsSheet();
    App.clearLocalData();
  });
  document.addEventListener("keydown", handleSettingsKeydown);

  /* ---- init ---- */
  syncReminderField();
  App.renderQuestion();
  App.updateProgress();
  App.updateBudgetCount("core");
})(window);
