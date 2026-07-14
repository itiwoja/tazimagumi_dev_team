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
    else if (id === "s3") {
      $("cta").textContent = App.CTA_LABEL[id];
      if (typeof App.renderS3 === "function") {
        App.renderS3();
      }
    }
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
    // メモリ上の記録も初期化してから resetS1/showScreen（autosaveラップ対象）を呼ぶ。
    // 先に消さないと、直後の自動保存で records が midashinami:v1 に書き戻される（Issue #119）。
    state.records.todayDone = false;
    state.records.weekRating = null;
    if (typeof App.repaintRecords === "function") App.repaintRecords();
    App.resetS1();
    App.showScreen("s1");
    App.toast("保存データを削除しました");
  };

  /* =================== [F-03/04/05] S3 商品候補・比較 =================== */
  var selectedIds = [];

  App.updateBudgetCount = function (budget) {
    var numEl = $("budgetNum");
    if (!numEl || typeof global.filterProductsByBudget !== "function") return;
    numEl.textContent = String(global.filterProductsByBudget(budget).length);

    // 予算切り替え時にも再描画
    if (typeof App.renderS3 === "function") {
      App.renderS3(budget);
    }
  };

  App.renderS3 = function (budget) {
    if (!budget) {
      var activeBudgetBtn = document.querySelector(".budget__btn.is-on");
      budget = activeBudgetBtn ? activeBudgetBtn.getAttribute("data-budget") : "core";
    }

    // 候補商品の抽出
    var products = [];
    try {
      var diagnosis = state.completed ? App.diagnose(state.answers) : null;
      if (diagnosis && typeof App.recommend === "function") {
        var rec = App.recommend(diagnosis, budget);
        if (rec && rec.main) {
          rec.main.forEach(function (group) {
            products = products.concat(group.products);
          });
        }
      }
    } catch (e) {
      // recommend が未実装の場合は fallback
    }

    if (products.length === 0) {
      products = global.filterProductsByBudget ? global.filterProductsByBudget(budget) : [];
    }

    // 選択状態のバリデーション・初期化
    var validSelectedIds = selectedIds.filter(function (id) {
      return products.some(function (p) { return p.id === id; });
    });

    // 初期表示または予算切り替え等で選択が空になった場合、先頭2件をデフォルト選択
    if (validSelectedIds.length === 0 && products.length > 0) {
      validSelectedIds = products.slice(0, 2).map(function (p) { return p.id; });
    }
    selectedIds = validSelectedIds;

    // 候補リストの描画
    var candListEl = document.querySelector(".cand");
    if (candListEl) {
      var candHtml = "";
      products.forEach(function (p) {
        var isSelected = selectedIds.indexOf(p.id) !== -1;
        candHtml += '<li class="card cand__item" data-id="' + p.id + '" role="checkbox" aria-checked="' + isSelected + '" tabindex="0">';
        candHtml += '<span class="medal">候補</span>';
        candHtml += '<div class="cand__top" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">';
        candHtml += '  <div class="cand__info">';
        candHtml += '    <h3 class="cand__name">' + p.name + '</h3>';
        candHtml += '    <p class="cand__price"><span class="num">¥' + p.price.toLocaleString() + '</span> <span class="cand__vol">／ ' + p.volume + 'mL</span></p>';
        candHtml += '  </div>';
        candHtml += '  <div class="cand__checkbox-ui" style="width: 20px; height: 20px; border: 2px solid var(--line-strong); border-radius: 50%; flex-shrink: 0; margin-left: 12px; background: #fff; box-shadow: inset 0 0 0 4px #fff; transition: background 160ms var(--ease), border-color 160ms var(--ease);"></div>';
        candHtml += '</div>';

        // タグの描画
        if (Array.isArray(p.ingredients) && p.ingredients.length > 0) {
          candHtml += '<div class="tags">';
          p.ingredients.forEach(function (tag) {
            var isFree = tag.indexOf("フリー") !== -1 || tag.indexOf("無") === 0 || tag === "弱酸性";
            var tagClass = isFree ? "tag--free" : "tag--has";
            candHtml += '<span class="tag ' + tagClass + '">' + tag + '</span>';
          });
          candHtml += '</div>';
        }
        
        candHtml += '</li>';
      });
      candListEl.innerHTML = candHtml;

      // イベントリスナーの配線（一度だけ）
      if (!candListEl.dataset.listenerAttached) {
        candListEl.dataset.listenerAttached = "true";

        var toggleSelect = function (id) {
          var idx = selectedIds.indexOf(id);
          if (idx !== -1) {
            selectedIds.splice(idx, 1);
          } else {
            if (selectedIds.length >= 3) {
              App.toast("比較できるのは最大3商品までです");
              return;
            }
            selectedIds.push(id);
          }
          App.renderS3(budget);
        };

        candListEl.addEventListener("click", function (e) {
          var item = e.target.closest(".cand__item");
          if (item) {
            toggleSelect(item.getAttribute("data-id"));
          }
        });

        candListEl.addEventListener("keydown", function (e) {
          if (e.key === " " || e.key === "Enter") {
            var item = e.target.closest(".cand__item");
            if (item) {
              e.preventDefault();
              toggleSelect(item.getAttribute("data-id"));
            }
          }
        });
      }
    }

    // 比較表の構築と描画
    var selectedProducts = products.filter(function (p) {
      return selectedIds.indexOf(p.id) !== -1;
    });

    var compareEl = document.querySelector(".compare");
    if (compareEl) {
      compareEl.style.setProperty("--cols", String(selectedProducts.length));

      // セクションの見出しラベル更新
      var compareLabel = compareEl.previousElementSibling;
      if (compareLabel && compareLabel.classList.contains("sec-label")) {
        if (selectedProducts.length === 0) {
          compareLabel.textContent = "商品をくらべる";
        } else {
          compareLabel.textContent = selectedProducts.length + "つをくらべる";
        }
      }

      if (selectedProducts.length === 0) {
        compareEl.innerHTML = '<p class="compare-placeholder" style="text-align: center; padding: 24px; color: var(--muted); font-size: 13px; border: 1px dashed var(--line); border-radius: var(--r-card); background: #fff; margin: 12px 0;">商品をえらぶと、ここに比較表が表示されます</p>';
        return;
      }

      var table = App.buildCompareTable(selectedProducts);
      var html = "";

      // ヘッダ行
      html += '<div class="compare__row compare__row--head" role="row">';
      html += '  <span class="compare__lab" role="columnheader">項目</span>';
      table.columns.forEach(function (p) {
        html += '  <span class="compare__cell" role="columnheader">' + p.name + '</span>';
      });
      html += '</div>';

      // 比較データ行
      table.rows.forEach(function (row) {
        html += '<div class="compare__row' + (row.differs ? ' is-diff' : '') + '" role="row">';
        html += '  <span class="compare__lab" role="rowheader">' + row.label + '</span>';
        row.values.forEach(function (val) {
          if (val.indexOf("¥") === 0) {
            html += '  <span class="compare__cell"><b class="num price">' + val + '</b></span>';
          } else if (/^\d/.test(val)) {
            html += '  <span class="compare__cell"><span class="num">' + val + '</span></span>';
          } else {
            html += '  <span class="compare__cell">' + val + '</span>';
          }
        });
        html += '</div>';
      });

      compareEl.innerHTML = html;
    }
  };
})(window);
