/* =====================================================================
   画面ロジック（S1ウィザード / S2-S4） — 画面担当の作業場所
   担当タスク:
     [F-01] 初回チェック（S1ウィザード）
     [F-02] ロードマップ（S2）
     [F-03/04/05] 商品候補・比較（S3）は app/js/s3.js へ分離
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

    if (typeLabel) typeLabel.textContent = "あなたは「" + meta.name + "」タイプの傾向がありそうです";
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

  App.playResultReveal = function () {
    var card = $("s2ResultCard");
    if (!card) return;

    card.classList.remove("result-card--revealing");
    // Force a reflow so the same animation can play after a fresh diagnosis.
    void card.offsetWidth;
    card.classList.add("result-card--revealing");
    card.addEventListener("animationend", function () {
      card.classList.remove("result-card--revealing");
    }, { once: true });
  };

  /* =================== 完了 / 画面遷移 =================== */
  App.complete = function () {
    var completedNow = !state.completed;
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
    if (completedNow) App.playResultReveal();
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
    else if (id === "s2") {
      App.renderRoadmap();
      $("cta").textContent = App.CTA_LABEL[id];
    }
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
    state.diagnosis = null;
    state.roadmap = null;
    if (typeof App.resetS3Comparison === "function") App.resetS3Comparison();
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
    // hasSeenIntro を巻き戻さない（設計書 SC-00 §4: 別項目は保持）
    App.prefs = {
      reminderTime: nextTime,
      hasSeenIntro: App.prefs.hasSeenIntro === true
    };
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
    App.prefs = { reminderTime: "", hasSeenIntro: false };
    // メモリ上の記録も初期化してから resetS1/showScreen（autosaveラップ対象）を呼ぶ。
    // 先に消さないと、直後の自動保存で records が midashinami:v1 に書き戻される（Issue #119）。
    state.records.todayDone = false;
    state.records.weekRating = null;
    state.records.doneDates = [];
    state.records.lastDoneAt = null;
    if (typeof App.repaintRecords === "function") App.repaintRecords();
    // 非ブラウザの検証環境ではDOMがないため、状態初期化だけを行う。
    if (typeof document !== "undefined" && document && typeof document.getElementById === "function") {
      App.resetS1();
      App.showScreen("s1");
    }
    App.toast("保存データを削除しました");
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
    return typeof App.toLocalDateKey === "function" ? App.toLocalDateKey(d) : "";
  }

  /** records から S4 の累計表示に必要な情報だけを作る。 */
  App.summarizeRecords = function (records, today) {
    var normalized = typeof App.normalizeRecords === "function"
      ? App.normalizeRecords(records, today)
      : { doneDates: [], lastDoneAt: null };
    var total = normalized.doneDates.length;
    var isReturning = total > 0 && normalized.lastDoneAt !== null &&
      Math.round((new Date(today + "T00:00:00").getTime() - new Date(normalized.lastDoneAt + "T00:00:00").getTime()) / 86400000) >= 3;
    return { total: total, isReturning: isReturning };
  };

  App.recordTotalCopy = function (summary) {
    if (summary.total === 0) return "記録はこれから。できた日がここにたまっていきます";
    if (summary.isReturning) return "おかえりなさい。これまでの " + summary.total + " 日はそのままです";
    return "これまでに " + summary.total + " 日できました";
  };

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
    var normalizedRecords = typeof App.normalizeRecords === "function"
      ? App.normalizeRecords(state.records, todayStr) : state.records;
    state.records.todayDone = normalizedRecords.todayDone;
    state.records.weekRating = normalizedRecords.weekRating;
    state.records.doneDates = normalizedRecords.doneDates;
    state.records.lastDoneAt = normalizedRecords.lastDoneAt;

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

    // 旧週次ログの当日記録は、履歴がない保存データだけを一度だけ移行する。
    var todayItem = log.days.find(function (d) { return d.date === todayStr; });
    if (!state.records.doneDates.length && todayItem && todayItem.done && typeof App.syncTodayRecord === "function") {
      App.syncTodayRecord(true, todayStr);
    }

    // 新しい履歴を当日の週ドットへ反映し、従来の週次ログの見せ方を維持する。
    if (todayItem && todayItem.done !== state.records.todayDone) {
      todayItem.done = state.records.todayDone;
      saveLog(log);
    }

    // 今週の評価状態を同期
    var currentWeek = log.weeks.find(function (w) {
      var start = w.weekStart;
      var end = addDays(start, 6);
      return todayStr >= start && todayStr <= end;
    });
    if (currentWeek) {
      state.records.weekRating = typeof currentWeek.rating === "string" ? currentWeek.rating : null;
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

    var totalEl = $("weekTotal");
    if (totalEl) totalEl.textContent = App.recordTotalCopy(App.summarizeRecords(state.records, todayStr));

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
          var recordDate = toDateKey(new Date());
          todayBtn.setAttribute("aria-pressed", next ? "true" : "false");
          if (typeof App.syncTodayRecord === "function") App.syncTodayRecord(next, recordDate);
          else state.records.todayDone = next;

          var currentLog = loadLog();
          var todayItem = currentLog.days.find(function (d) { return d.date === recordDate; });
          if (todayItem) {
            todayItem.done = next;
          } else {
            currentLog.days.push({ date: recordDate, done: next });
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
