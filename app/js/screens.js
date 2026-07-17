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
    else if (id === "s4") {
      $("cta").textContent = App.CTA_LABEL[id];
      if (typeof App.renderS4 === "function") {
        App.renderS4();
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
    if (nextTime && global.Notification && global.Notification.permission === "default") {
      global.Notification.requestPermission();
    }
    if (state.current === "s4" && typeof App.renderS4 === "function") {
      App.renderS4();
    }
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

  /* =================== [F-06] S4 継続記録 =================== */

  var ROUTINE_MAP = {
    type1: {
      morning: "化粧水 → 軽めの保湿",
      night: "洗顔 → 化粧水 → 軽めの保湿"
    },
    type2: {
      morning: "化粧水 → 乳液",
      night: "洗顔 → 化粧水 → 乳液"
    },
    type3: {
      morning: "化粧水 → 低刺激保湿",
      night: "洗顔 → 化粧水 → 低刺激保湿"
    },
    type4: {
      morning: "ぬらす → ひげ剃り → 化粧水 → アフターシェーブ保湿",
      night: "洗顔 → 化粧水 → 保湿"
    },
    type5: {
      morning: "化粧水 → 保湿(日焼け止め)",
      night: "洗顔 → 化粧水 → うるおい保湿"
    },
    type6: {
      morning: "洗顔 → オールインワン",
      night: "洗顔 → オールインワン"
    }
  };

  function loadLog() {
    try {
      var raw = global.localStorage.getItem(App.LOCAL_KEYS.continuity);
      if (!raw) return { v: 1, days: [], weeks: [] };
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          v: typeof parsed.v === "number" ? parsed.v : 1,
          days: Array.isArray(parsed.days) ? parsed.days : [],
          weeks: Array.isArray(parsed.weeks) ? parsed.weeks : []
        };
      }
    } catch (e) {}
    return { v: 1, days: [], weeks: [] };
  }

  function saveLog(log) {
    try {
      global.localStorage.setItem(App.LOCAL_KEYS.continuity, JSON.stringify(log));
    } catch (e) {}
  }

  function toDateKey(d) {
    var y = d.getFullYear();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    return y + "-" + m + "-" + day;
  }

  function addDays(dateStr, numDays) {
    var parts = dateStr.split("-");
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setDate(d.getDate() + numDays);
    return toDateKey(d);
  }

  function getMondayOfDate(d) {
    var day = d.getDay();
    var diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  }

  var WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];
  function getWeekdayJa(dateStr) {
    var parts = dateStr.split("-");
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return WEEKDAYS_JA[d.getDay()];
  }

  function formatWeekRange(startStr) {
    var startParts = startStr.split("-");
    var endStr = addDays(startStr, 6);
    var endParts = endStr.split("-");
    return Number(startParts[1]) + "/" + Number(startParts[2]) + " 〜 " + Number(endParts[1]) + "/" + Number(endParts[2]);
  }

  App.renderS4 = function () {
    var today = new Date();
    var todayStr = toDateKey(today);

    // 1. ルーティン提示
    var diagnosis = state.completed ? App.diagnose(state.answers) : null;
    var primaryType = (diagnosis && diagnosis.primaryType) || "type6";
    var routines = ROUTINE_MAP[primaryType] || ROUTINE_MAP.type6;

    var mEl = $("routineMorning");
    var nEl = $("routineNight");
    if (mEl) mEl.textContent = routines.morning;
    if (nEl) nEl.textContent = routines.night;

    // 2. ログデータのロードと今週の初期化
    var log = loadLog();

    var weekContainsToday = log.weeks.some(function (w) {
      var start = w.weekStart;
      var end = addDays(start, 6);
      return todayStr >= start && todayStr <= end;
    });

    var currentMonday = getMondayOfDate(today);
    var currentMondayStr = toDateKey(currentMonday);

    if (!weekContainsToday) {
      log.weeks.push({ weekStart: currentMondayStr, rating: null });
      for (var i = 0; i < 7; i++) {
        var dStr = addDays(currentMondayStr, i);
        if (!log.days.some(function (d) { return d.date === dStr; })) {
          log.days.push({ date: dStr, done: false });
        }
      }

      // 3週間分だけ残して古い週を整理
      if (log.weeks.length > 3) {
        log.weeks.sort(function (a, b) { return a.weekStart.localeCompare(b.weekStart); });
        log.weeks = log.weeks.slice(-3);
        var oldestWeekStart = log.weeks[0].weekStart;
        log.days = log.days.filter(function (d) { return d.date >= oldestWeekStart; });
      }
      saveLog(log);
    }

    // 今日の記録状態を同期
    var todayItem = log.days.find(function (d) { return d.date === todayStr; });
    if (todayItem) {
      state.records.todayDone = todayItem.done;
    } else {
      state.records.todayDone = false;
    }

    // 今週の評価状態を同期
    var currentWeek = log.weeks.find(function (w) {
      var start = w.weekStart;
      var end = addDays(start, 6);
      return todayStr >= start && todayStr <= end;
    });
    if (currentWeek) {
      state.records.weekRating = currentWeek.rating;
    }

    // 3. 今週のドット描画
    var dotsHtml = "";
    if (currentWeek) {
      var start = currentWeek.weekStart;
      for (var i = 0; i < 7; i++) {
        var dayStr = addDays(start, i);
        var item = log.days.find(function (d) { return d.date === dayStr; }) || { done: false };
        var isToday = dayStr === todayStr;
        var isFuture = dayStr > todayStr;

        dotsHtml += '<div class="dotwrap" role="listitem">';
        if (isToday) {
          dotsHtml += '  <button class="dot dot--today" id="todayDot" aria-pressed="' + (state.records.todayDone ? "true" : "false") + '" aria-label="今日をタップして記録"></button>';
          dotsHtml += '  <span class="dotlab dotlab--today">今日</span>';
        } else if (isFuture) {
          dotsHtml += '  <div class="dot" role="img" aria-label="' + getWeekdayJa(dayStr) + '曜 まだ"></div>';
          dotsHtml += '  <span class="dotlab">' + getWeekdayJa(dayStr) + '</span>';
        } else {
          var statusClass = item.done ? "dot--done" : "dot--miss";
          var labelText = item.done ? "記録済み" : "記録なし";
          dotsHtml += '  <div class="dot ' + statusClass + '" role="img" aria-label="' + getWeekdayJa(dayStr) + '曜 ' + labelText + '"></div>';
          dotsHtml += '  <span class="dotlab">' + getWeekdayJa(dayStr) + '</span>';
        }
        dotsHtml += '</div>';
      }
    }
    var dotsContainer = $("dots");
    if (dotsContainer) {
      dotsContainer.innerHTML = dotsHtml;
    }

    // 4. 今週の自己評価選択ボタン状態の反映
    qAll(".rate").forEach(function (r) {
      var on = state.records.weekRating && r.textContent.trim() === state.records.weekRating;
      r.setAttribute("aria-pressed", on ? "true" : "false");
    });

    // 5. 過去の記録 (2週分) の描画
    var historyHtml = "";
    var pastWeeks = log.weeks.filter(function (w) {
      var start = w.weekStart;
      var end = addDays(start, 6);
      return !(todayStr >= start && todayStr <= end);
    });

    if (pastWeeks.length > 0) {
      pastWeeks.sort(function (a, b) { return b.weekStart.localeCompare(a.weekStart); }); // 新しい順
      historyHtml += '<p class="sec-label">過去の記録</p>';
      historyHtml += '<div class="card history-card" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">';

      pastWeeks.forEach(function (w) {
        var start = w.weekStart;
        var rangeText = formatWeekRange(start);
        var ratingText = w.rating ? w.rating : "なし";

        historyHtml += '  <div class="history-week" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--line-soft); padding-bottom: 8px;">';
        historyHtml += '    <div>';
        historyHtml += '      <p style="margin: 0; font-size: 13px; font-weight: 700;">' + rangeText + ' の記録</p>';
        historyHtml += '      <p style="margin: 2px 0 0; font-size: 11px; color: var(--muted);">自己評価: ' + ratingText + '</p>';
        historyHtml += '    </div>';

        // 過去週の7つのドット
        historyHtml += '    <div style="display: flex; gap: 4px; align-items: center;">';
        for (var i = 0; i < 7; i++) {
          var dayStr = addDays(start, i);
          var item = log.days.find(function (d) { return d.date === dayStr; }) || { done: false };
          var statusStyle = item.done
            ? 'background: var(--green-strong); border-color: var(--green-strong);'
            : 'border-style: dashed; background: transparent;';
          historyHtml += '      <div class="dot" style="width: 10px; height: 10px; border-radius: 50%; border-width: 1px; border-style: solid; margin: 0; padding: 0; flex-shrink: 0; ' + statusStyle + '" title="' + getWeekdayJa(dayStr) + '曜"></div>';
        }
        historyHtml += '    </div>';
        historyHtml += '  </div>';
      });

      historyHtml += '</div>';
    }

    var histContainer = $("historyContainer");
    if (histContainer) {
      histContainer.innerHTML = historyHtml;
    }

    // 過去履歴のカード内の末尾ボーダーラインを消去
    var historyWeeks = qAll("#historyContainer .history-week");
    if (historyWeeks.length > 0) {
      historyWeeks[historyWeeks.length - 1].style.borderBottom = "none";
      historyWeeks[historyWeeks.length - 1].style.paddingBottom = "0";
    }

    // 6. リマインド設定状態
    var reminderText = "🔔 リマインドはオフです（設定から変更できます）";
    if (App.prefs && App.prefs.reminderTime) {
      reminderText = "🔔 毎日 " + App.prefs.reminderTime + " にリマインドを設定中";
    }
    var remStatus = $("reminderStatus");
    if (remStatus) {
      remStatus.textContent = reminderText;
    }

    // 7. イベントリスナー（デリゲーション配線）
    // 今日のドットトグル
    if (dotsContainer && !dotsContainer.dataset.listenerAttached) {
      dotsContainer.dataset.listenerAttached = "true";
      dotsContainer.addEventListener("click", function (e) {
        var todayBtn = e.target.closest("#todayDot");
        if (todayBtn) {
          var on = todayBtn.getAttribute("aria-pressed") === "true";
          var next = !on;
          todayBtn.setAttribute("aria-pressed", next ? "true" : "false");
          state.records.todayDone = next;

          var currentLog = loadLog();
          var todayItem = currentLog.days.find(function (d) { return d.date === todayStr; });
          if (todayItem) {
            todayItem.done = next;
          } else {
            currentLog.days.push({ date: todayStr, done: next });
          }
          saveLog(currentLog);

          if (next) App.toast("今日ぶん、記録できました");
          App.persist();
          App.renderS4();
        }
      });
    }

    // 今週の自己評価
    var ratingGroup = document.querySelector("#s4 .rating");
    if (ratingGroup && !ratingGroup.dataset.listenerAttached) {
      ratingGroup.dataset.listenerAttached = "true";
      ratingGroup.addEventListener("click", function (e) {
        var btn = e.target.closest(".rate");
        if (btn) {
          var rating = btn.textContent.trim();
          state.records.weekRating = rating;

          var currentLog = loadLog();
          var currentWeekItem = currentLog.weeks.find(function (w) {
            var start = w.weekStart;
            var end = addDays(start, 6);
            return todayStr >= start && todayStr <= end;
          });
          if (currentWeekItem) {
            currentWeekItem.rating = rating;
          } else {
            currentLog.weeks.push({ weekStart: currentMondayStr, rating: rating });
          }
          saveLog(currentLog);

          App.persist();
          App.renderS4();
        }
      });
    }
  };
})(window);
