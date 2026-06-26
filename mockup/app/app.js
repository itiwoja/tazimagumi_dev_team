/* =====================================================================
   男の身だしなみアプリ — 4画面モックアップ ロジック
   - S1はウィザード(手動「次へ」/「戻る」。auto-submitしない=誤タップ不安を消す)
   - 進捗・残量コピーはstateから動的生成
   - S2-S4タブはS1完了まではロック(ウィザードと進捗の一貫性)
   ===================================================================== */
(function () {
  "use strict";

  var S1_TOTAL = 5;
  var SCREENS = ["s1", "s2", "s3", "s4"];
  var STEP_LABEL = { s1: "初回チェック", s2: "ロードマップ", s3: "商品をくらべる", s4: "継続記録" };
  var CTA_LABEL = {
    s2: "具体的な商品の候補を見る",
    s3: "このまま記録を始める",
    s4: "もう一度はじめから見る"
  };

  var state = { current: "s1", qIndex: 0, answers: new Array(S1_TOTAL).fill(null), completed: false };

  var $ = function (id) { return document.getElementById(id); };
  var qAll = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var els = {
    progressFill: $("progressFill"),
    progressBar: $("progressBar"),
    stepLabel: $("stepLabel"),
    cta: $("cta"),
    dock: document.querySelector(".dock"),
    s1Remain: $("s1Remain"),
    toast: $("toast"),
    qstack: $("qstack"),
    tabs: qAll(".tab")
  };

  /* ---- back button (S1用・dockに差し込む) ---- */
  var backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "cta-back";
  backBtn.setAttribute("aria-label", "ひとつ前の質問にもどる");
  backBtn.textContent = "←";
  backBtn.style.cssText =
    "flex:0 0 auto;width:52px;height:52px;border-radius:14px;border:1px solid var(--border);" +
    "background:var(--surface);color:var(--text);font-size:20px;font-weight:700;cursor:pointer;display:none";
  els.dock.insertBefore(backBtn, els.cta);

  /* =================== progress =================== */
  function answeredCount() {
    var n = 0;
    for (var i = 0; i < state.answers.length; i++) if (state.answers[i] !== null) n++;
    return n;
  }
  function updateRemain() {
    var r = S1_TOTAL - answeredCount();
    els.s1Remain.textContent = r > 0
      ? "あと " + r + " 問・むずかしい言葉は出てきません"
      : "ぜんぶ選べました。プランを見てみましょう";
  }
  function updateProgress() {
    var p;
    if (!state.completed) {
      p = 0.04 + 0.21 * (answeredCount() / S1_TOTAL);
    } else {
      p = (SCREENS.indexOf(state.current) + 1) / SCREENS.length; // .25 .5 .75 1
    }
    if (p > 1) p = 1;
    els.progressFill.style.setProperty("--p", p.toFixed(3));
    els.progressBar.setAttribute("aria-valuenow", String(Math.round(p * 100)));
    els.progressBar.setAttribute("aria-valuetext", state.completed
      ? "ステップ " + (SCREENS.indexOf(state.current) + 1) + " / " + SCREENS.length
      : S1_TOTAL + "問中 " + answeredCount() + "問 完了");
  }

  /* =================== toast =================== */
  var toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    // force reflow so transition runs
    void els.toast.offsetWidth;
    els.toast.classList.add("is-show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.classList.remove("is-show");
      setTimeout(function () { els.toast.hidden = true; }, 220);
    }, 1900);
  }

  /* =================== S1 wizard =================== */
  function currentQCard() { return els.qstack.querySelector('.qcard[data-q="' + state.qIndex + '"]'); }

  function renderQuestion() {
    qAll(".qcard", els.qstack).forEach(function (c) {
      c.hidden = Number(c.getAttribute("data-q")) !== state.qIndex;
    });
    updateRemain();
    backBtn.style.display = state.qIndex > 0 ? "block" : "none";
    syncCTA();
  }

  function syncCTA() {
    var c = els.cta;
    if (state.current !== "s1") return;
    var answered = state.answers[state.qIndex] !== null;
    var isLast = state.qIndex === S1_TOTAL - 1;
    c.textContent = isLast ? "プランを見る" : "次へ";
    c.disabled = !answered;
  }

  function pick(chip) {
    var card = currentQCard();
    qAll(".chip", card).forEach(function (ch) { ch.setAttribute("aria-checked", "false"); });
    chip.setAttribute("aria-checked", "true");
    state.answers[state.qIndex] = chip.querySelector(".chip__label").textContent.trim();
    updateProgress();
    updateRemain();
    syncCTA();
  }

  function nextQuestion() {
    if (state.answers[state.qIndex] === null) return;
    if (state.qIndex < S1_TOTAL - 1) {
      var crossedHalf = state.qIndex + 1 === Math.ceil(S1_TOTAL / 2);
      state.qIndex++;
      renderQuestion();
      els.qstack.scrollIntoView({ block: "nearest" });
      if (crossedHalf) toast("ここまでで半分。いいペースです");
    } else {
      complete();
    }
  }
  function prevQuestion() {
    if (state.qIndex > 0) { state.qIndex--; renderQuestion(); }
  }

  /* =================== completion / navigation =================== */
  function complete() {
    if (!state.completed) {
      state.completed = true;
      els.tabs.forEach(function (t) {
        t.classList.remove("is-locked");
        t.removeAttribute("aria-disabled");
        if (t.getAttribute("data-go") === "s1") t.classList.add("is-done");
      });
      toast("あなた専用の3ステップができました");
    }
    showScreen("s2");
  }

  function showScreen(id) {
    state.current = id;
    SCREENS.forEach(function (s) { $(s).hidden = s !== id; });
    els.tabs.forEach(function (t) {
      var on = t.getAttribute("data-go") === id;
      t.classList.toggle("is-active", on);
      if (on) t.setAttribute("aria-current", "step"); else t.removeAttribute("aria-current");
    });
    els.stepLabel.textContent = STEP_LABEL[id];

    // CTA + back per screen (s1のCTA無効/有効はsyncCTAに一本化)
    backBtn.style.display = (id === "s1" && state.qIndex > 0) ? "block" : "none";
    if (id === "s1") { renderQuestion(); }
    else { els.cta.textContent = CTA_LABEL[id]; els.cta.disabled = false; }

    updateProgress();
    var wrap = document.getElementById("screenWrap");
    if (wrap) wrap.scrollTop = 0;
  }

  function ctaClick() {
    switch (state.current) {
      case "s1": nextQuestion(); break;
      case "s2": showScreen("s3"); break;
      case "s3": showScreen("s4"); break;
      case "s4": // demo: 最初から
        resetS1(); showScreen("s1"); break;
    }
  }

  function resetS1() {
    state.qIndex = 0;
    state.answers = new Array(S1_TOTAL).fill(null);
    state.completed = false;
    qAll(".chip", els.qstack).forEach(function (ch) { ch.setAttribute("aria-checked", "false"); });
    els.tabs.forEach(function (t) {
      var go = t.getAttribute("data-go");
      t.classList.remove("is-done");
      if (go !== "s1") { t.classList.add("is-locked"); t.setAttribute("aria-disabled", "true"); }
    });
  }

  /* =================== term sheet =================== */
  var TERMS = {
    "化粧水": {
      t: "化粧水ってなに？",
      b: "洗ったあとの肌に、水分を足すための液です。化粧というより「肌の水やり」と思えばOK。むずかしく考えなくて大丈夫です。"
    }
  };
  var sheetTrigger = null;
  function trapTab(e) {
    if (e.key !== "Tab") return;
    var f = qAll("button,[href],[tabindex]", $("sheet")).filter(function (n) { return n.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openSheet(key, trigger) {
    var data = TERMS[key]; if (!data) return;
    sheetTrigger = trigger || null;
    $("sheetTitle").textContent = data.t;
    $("sheetBody").textContent = data.b;
    $("sheet").hidden = false;
    var phone = document.querySelector(".phone"); if (phone) phone.inert = true;
    $("sheet").addEventListener("keydown", trapTab);
    $("sheetClose").focus();
  }
  function closeSheet() {
    if ($("sheet").hidden) return;
    $("sheet").hidden = true;
    $("sheet").removeEventListener("keydown", trapTab);
    var phone = document.querySelector(".phone"); if (phone) phone.inert = false;
    if (sheetTrigger && sheetTrigger.focus) { sheetTrigger.focus(); }
    sheetTrigger = null;
  }

  /* =================== event wiring =================== */
  // chips (event delegation)
  els.qstack.addEventListener("click", function (e) {
    var chip = e.target.closest("[data-pick]");
    if (chip) pick(chip);
  });

  // cta / back
  els.cta.addEventListener("click", ctaClick);
  backBtn.addEventListener("click", prevQuestion);

  // tabs
  els.tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      var go = t.getAttribute("data-go");
      if (go === "s1" || state.completed) { showScreen(go); }
      else { toast("初回チェック（5問）を終えると開きます"); }
    });
  });

  // term buttons (delegate on s2)
  $("s2").addEventListener("click", function (e) {
    var b = e.target.closest(".term");
    if (b) openSheet(b.getAttribute("data-term"), b);
  });
  $("sheetClose").addEventListener("click", closeSheet);
  $("sheetScrim").addEventListener("click", closeSheet);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

  // budget toggle
  var BUDGET_COUNT = { core: 12, sub: 5 };
  qAll(".budget__btn").forEach(function (b) {
    b.addEventListener("click", function () {
      qAll(".budget__btn").forEach(function (x) {
        x.classList.remove("is-on"); x.setAttribute("aria-pressed", "false");
      });
      b.classList.add("is-on"); b.setAttribute("aria-pressed", "true");
      var key = b.getAttribute("data-budget");
      $("budgetNum").textContent = String(BUDGET_COUNT[key]);
      if (key === "sub") toast("まず1本から。気軽に始められます");
    });
  });

  // today dot
  var dot = $("todayDot");
  if (dot) dot.addEventListener("click", function () {
    var on = dot.getAttribute("aria-pressed") === "true";
    dot.setAttribute("aria-pressed", on ? "false" : "true");
    if (!on) toast("今日ぶん、記録できました");
  });

  // self rating (single select)
  qAll(".rate").forEach(function (r) {
    r.addEventListener("click", function () {
      qAll(".rate").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      r.setAttribute("aria-pressed", "true");
    });
  });

  // make tab row keyboard-friendly: locked tabs still focusable to announce reason
  els.tabs.forEach(function (t) { if (!t.hasAttribute("type")) t.setAttribute("type", "button"); });

  /* =================== init =================== */
  renderQuestion();
  updateProgress();
})();
