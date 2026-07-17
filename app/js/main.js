/* =====================================================================
   起動・イベント配線 — エントリポイント
   担当タスク: [CORE] アプリ基盤（基本このファイルは触らない）
   ---------------------------------------------------------------------
   読み込み順（index.html）:
     1) data/products.js  2) js/state.js  3) js/storage.js  4) js/contracts.js
     5) js/disclaimer.js  6) js/screens.js  7) js/debug.js  8) js/main.js
   ===================================================================== */
(function (global) {
  "use strict";

  var App = global.App;
  var $ = App.$, qAll = App.qAll, state = App.state;

  /* ===================================================================
     デバッグモード（Issue #76 [提案-M4]）
     - ?debug=1 で診断を通さず全タブを解放する（開発・動作確認用）。
     - 解放は「遷移の許可」と「見た目」だけで、state.completed は変更しない
       （自動保存で完了扱いが永続化されるのを防ぐ。URLを外せば通常に戻る）。
     - App.debugDump() で現在の状態・prefs・保存内容を確認できる。
     =================================================================== */
  App.isDebug = /[?&]debug=1(?:&|$)/.test(global.location.search);

  App.debugDump = function () {
    return {
      state: JSON.parse(JSON.stringify(state)),
      prefs: JSON.parse(JSON.stringify(App.prefs)),
      saved: App.storage ? App.storage.load() : null
    };
  };

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

  /* ---- settings sheet ---- */
  var settingsSheet = $("settingsSheet");
  var settingsClose = $("settingsClose");
  var settingsScrim = $("settingsScrim");
  var settingsOpenBtn = $("settingsBtn");
  var reminderTime = $("reminderTime");
  var reminderSaveBtn = $("reminderSaveBtn");
  var resetDiagnosisBtn = $("resetDiagnosisBtn");
  var exportDataBtn = $("exportDataBtn");
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
      if (go === "s1" || state.completed || App.isDebug) { App.showScreen(go); }
      else { App.toast("初回チェック（5問）を終えると開きます"); }
    });
  });

  /* ---- 用語シート（S2 の「○○ってなに？」） ----
     ※現状 app/index.html の S2 には .term / data-term を持つトリガー要素が無く、
       この配線は休眠状態（シートは開かない）。トリガー追加＋辞書拡充は Issue #70。 */
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

  /* ---- プライバシーシート（Issue #84） ---- */
  var privacyOpenBtn = $("privacyOpenBtn");
  var privacySheet = $("privacySheet");
  var privacyClose = $("privacyClose");
  var privacyScrim = $("privacyScrim");
  var privacyLastFocus = null;
  function openPrivacy() {
    privacyLastFocus = document.activeElement;
    if (privacySheet) privacySheet.hidden = false;
    if (privacyClose) privacyClose.focus();
  }
  function closePrivacy() {
    if (privacySheet) privacySheet.hidden = true;
    if (privacyLastFocus && typeof privacyLastFocus.focus === "function") privacyLastFocus.focus();
  }
  if (privacyOpenBtn) privacyOpenBtn.addEventListener("click", openPrivacy);
  if (privacyClose) privacyClose.addEventListener("click", closePrivacy);
  if (privacyScrim) privacyScrim.addEventListener("click", closePrivacy);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && privacySheet && !privacySheet.hidden) {
      e.preventDefault();
      e.stopImmediatePropagation();
      closePrivacy();
    }
  });

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
  if (exportDataBtn) exportDataBtn.addEventListener("click", function () {
    if (typeof App.exportData === "function") App.exportData();
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
  // screens.js の clearLocalData から S4 記録UIを再描画するために公開（Issue #119）
  App.repaintRecords = restoreRecords;

  /* ---- init ---- */
  syncReminderField();

  var restored = App.restore();

  if (restored) {
    restoreChips();
    restoreRecords();
    if (state.completed) {
      // 古いセーブデータ等の理由で診断結果が欠けている場合は再生成
      if (!state.diagnosis || !state.roadmap) {
        try {
          state.diagnosis = App.diagnose(state.answers);
          state.roadmap = App.buildRoadmap(state.diagnosis);
        } catch (e) {
          console.error("診断データの再生成に失敗しました:", e);
        }
      }

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

  /* ---- デバッグモード: タブの見た目も解放（Issue #76） ---- */
  if (App.isDebug) {
    qAll(".tab").forEach(function (t) {
      t.classList.remove("is-locked");
      t.removeAttribute("aria-disabled");
    });
    App.toast("デバッグモード: 全画面を解放しました");
  }
})(window);
