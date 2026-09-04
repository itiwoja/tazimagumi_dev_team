/* =====================================================================
   S3 商品候補・比較（F-03/04/05） — data/products.jsを使う
   ---------------------------------------------------------------------
   - 共有状態は window.App（state.js）から読む。
   - S3の候補・比較ロジックと選択状態をこのmoduleへ集約する。
   ===================================================================== */
(function (global) {
  "use strict";

  var App = global.App;
  var $ = App.$, qAll = App.qAll, state = App.state;

  App.updateBudgetCount = function (budget, candidateCount) {
    var numEl = $("budgetNum");
    if (!numEl) return;
    var count;
    if (typeof candidateCount === "number") {
      count = candidateCount;
    } else {
      if (typeof global.filterProductsByBudget !== "function") return;
      count = global.filterProductsByBudget(budget).length;
    }
    numEl.textContent = String(count);
  };

  function currentS3Budget() {
    var onBtn = document.querySelector("#s3 .budget__btn.is-on");
    return onBtn ? onBtn.getAttribute("data-budget") : "core";
  }

  function formatYen(price) {
    return "¥" + Number(price || 0).toLocaleString("ja-JP");
  }

  function categoryGroupId(category, lane) {
    var laneSuffix = lane === "sub" ? "-sub" : "";
    return "cand-group-" + encodeURIComponent(String(category)).replace(/%/g, "_") + laneSuffix;
  }

  App.categoryGroupId = categoryGroupId;

  var selectedCompareIds = [];
  var selectedCompareBudget = null;
  var focusedGroupTimer = null;

  App.resetS3Comparison = function () {
    selectedCompareIds = [];
    selectedCompareBudget = null;
  };

  function uniqueRecommendation(recommendation) {
    var seenIds = [];

    function uniqueGroups(groups) {
      if (!Array.isArray(groups)) return [];

      return groups.map(function (group) {
        var products = [];
        (Array.isArray(group.products) ? group.products : []).forEach(function (product) {
          if (!product || product.id === undefined || product.id === null) {
            products.push(product);
            return;
          }
          if (seenIds.indexOf(product.id) !== -1) return;
          seenIds.push(product.id);
          products.push(product);
        });

        return {
          category: group.category,
          products: products
        };
      });
    }

    return {
      main: uniqueGroups(recommendation && recommendation.main),
      sub: recommendation && Array.isArray(recommendation.sub)
        ? uniqueGroups(recommendation.sub)
        : null,
      isComposite: Boolean(recommendation && recommendation.isComposite)
    };
  }

  function recommendationProducts(recommendation) {
    var products = [];
    var seenIds = [];
    var groups = recommendation && Array.isArray(recommendation.main)
      ? recommendation.main.slice()
      : [];
    if (recommendation && Array.isArray(recommendation.sub)) {
      groups = groups.concat(recommendation.sub);
    }
    groups.forEach(function (group) {
      (group.products || []).forEach(function (product) {
        if (!product || product.id === undefined || product.id === null) {
          products.push(product);
          return;
        }
        if (seenIds.indexOf(product.id) !== -1) return;
        seenIds.push(product.id);
        products.push(product);
      });
    });
    return products;
  }

  function avoidedIngredients() {
    var prefs = App.prefs && typeof App.prefs === "object" ? App.prefs : {};
    if (typeof App.normalizeAvoidedIngredients === "function") {
      return App.normalizeAvoidedIngredients(prefs.avoidedIngredients);
    }
    return Array.isArray(prefs.avoidedIngredients) ? prefs.avoidedIngredients : [];
  }

  function productsForBudget(budget) {
    var products = typeof global.filterProductsByBudget === "function"
      ? global.filterProductsByBudget(budget)
      : (global.PRODUCTS || []).slice();
    return Array.isArray(products) ? products : [];
  }

  function priceAscending(left, right) {
    var leftPrice = typeof left.price === "number" ? left.price : Number.POSITIVE_INFINITY;
    var rightPrice = typeof right.price === "number" ? right.price : Number.POSITIVE_INFINITY;
    return leftPrice - rightPrice;
  }

  function findTypeMismatchAlternative(category, budget, avoided, expectedType, usedIds) {
    var categoryProducts = productsForBudget(budget).filter(function (product) {
      return product && product.category === category && Array.isArray(product.typeTags) &&
        product.typeTags.indexOf(expectedType) === -1 && usedIds.indexOf(product.id) === -1;
    });
    var filtered = typeof App.filterByAvoidedIngredients === "function"
      ? App.filterByAvoidedIngredients(categoryProducts, avoided).visible
      : categoryProducts;
    return filtered.sort(priceAscending)[0] || null;
  }

  function filterRecommendationByAvoidedIngredients(recommendation, budget, avoided, diagnosis) {
    var usedIds = [];

    function filterGroups(groups, expectedType) {
      if (!Array.isArray(groups)) return [];
      return groups.map(function (group) {
        var filtered = typeof App.filterByAvoidedIngredients === "function"
          ? App.filterByAvoidedIngredients(group.products, avoided)
          : { visible: group.products || [] };
        var products = filtered.visible;
        products.forEach(function (product) { usedIds.push(product.id); });
        if (products.length) return { category: group.category, products: products, isAlternative: false };

        // 設定が空のときは、従来の推薦結果をそのまま表示する。
        // NG成分が実際に候補を除外した場合だけ代替候補を探す。
        if (!avoided.length || !filtered.excluded || !filtered.excluded.length) return null;

        var alternative = findTypeMismatchAlternative(group.category, budget, avoided, expectedType, usedIds);
        if (alternative) {
          usedIds.push(alternative.id);
          return { category: group.category, products: [alternative], isAlternative: true };
        }
        return { category: group.category, products: [], isAlternative: false };
      }).filter(function (group) { return group !== null; });
    }

    return {
      main: filterGroups(recommendation.main, diagnosis.primaryType),
      sub: recommendation.isComposite
        ? filterGroups(recommendation.sub, diagnosis.secondaryType)
        : null,
      isComposite: recommendation.isComposite
    };
  }

  function buildCandItem(product, isTop) {
    var li = document.createElement("li");
    li.className = "card cand__item";

    var select = document.createElement("button");
    select.type = "button";
    select.className = "cand__select";
    select.setAttribute("data-product-id", product.id);
    select.setAttribute("aria-pressed", selectedCompareIds.indexOf(product.id) !== -1 ? "true" : "false");

    if (isTop) {
      var medal = document.createElement("span");
      medal.className = "medal";
      medal.textContent = "候補";
      select.appendChild(medal);
    }

    var top = document.createElement("div");
    top.className = "cand__top";

    var info = document.createElement("div");
    info.className = "cand__info";

    var name = document.createElement("h3");
    name.className = "cand__name";
    name.textContent = product.name;
    info.appendChild(name);

    var price = document.createElement("p");
    price.className = "cand__price";
    var num = document.createElement("span");
    num.className = "num";
    num.textContent = formatYen(product.price);
    price.appendChild(num);
    price.appendChild(document.createTextNode(" "));
    var vol = document.createElement("span");
    vol.className = "cand__vol";
    vol.textContent = "／ " + product.volume + "mL";
    price.appendChild(vol);
    info.appendChild(price);

    if (product.summary_one_liner) {
      var note = document.createElement("p");
      note.className = "cand__note";
      note.textContent = product.summary_one_liner;
      info.appendChild(note);
    }

    top.appendChild(info);
    select.appendChild(top);

    var ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];
    if (ingredients.length) {
      var tags = document.createElement("div");
      tags.className = "tags";
      ingredients.forEach(function (ingredient) {
        var tag = document.createElement("span");
        tag.className = "tag tag--has";
        tag.textContent = ingredient;
        tags.appendChild(tag);
      });
      select.appendChild(tags);
    }

    li.classList.toggle("is-selected", selectedCompareIds.indexOf(product.id) !== -1);
    li.appendChild(select);
    return li;
  }

  function buildCandGroup(group, lane) {
    var groupEl = document.createElement("section");
    groupEl.className = "cand-group";
    groupEl.setAttribute("id", categoryGroupId(group.category, lane));

    var label = document.createElement("p");
    label.className = "sec-label";
    label.textContent = group.category + "の候補";
    groupEl.appendChild(label);

    var ul = document.createElement("ul");
    ul.className = "cand";

    if (!group.products.length) {
      var empty = document.createElement("li");
      empty.className = "card cand__item";
      var emptyNote = document.createElement("p");
      emptyNote.className = "cand__note";
      emptyNote.textContent = "この予算帯では候補が見つかりませんでした。";
      empty.appendChild(emptyNote);
      ul.appendChild(empty);
    } else {
      if (group.isAlternative) {
        var alternativeNote = document.createElement("li");
        alternativeNote.className = "cand__alternative-note";
        alternativeNote.textContent = "「" + group.category + "」は、選んだ成分を含まない同じタイプの候補が見つかりませんでした。タイプは異なりますが、この商品は選んだ成分を含みません。";
        ul.appendChild(alternativeNote);
      }
      group.products.forEach(function (product, index) {
        ul.appendChild(buildCandItem(product, index === 0 && !group.isAlternative));
      });
    }

    groupEl.appendChild(ul);
    return groupEl;
  }

  function findCategoryGroup(category, lane) {
    return document.getElementById(categoryGroupId(category, lane));
  }

  function appendEmptyCategoryGroup(category, lane) {
    var groupsEl = $("candGroups");
    if (!groupsEl || findCategoryGroup(category, lane)) return findCategoryGroup(category, lane);
    groupsEl.appendChild(buildCandGroup({ category: category, products: [] }, lane));
    return findCategoryGroup(category, lane);
  }

  function focusCategoryGroup(groupEl) {
    var firstCandidate = groupEl.querySelector("[data-product-id]");
    if (firstCandidate) {
      firstCandidate.focus();
      return;
    }
    groupEl.setAttribute("tabindex", "-1");
    groupEl.focus({ preventScroll: true });
  }

  function highlightCategoryGroup(groupEl) {
    if (focusedGroupTimer !== null && typeof global.clearTimeout === "function") {
      global.clearTimeout(focusedGroupTimer);
    }
    groupEl.classList.remove("is-focused");
    void groupEl.offsetWidth;
    groupEl.classList.add("is-focused");
    focusedGroupTimer = global.setTimeout(function () {
      groupEl.classList.remove("is-focused");
      focusedGroupTimer = null;
    }, 2000);
  }

  App.gotoCategory = function (category, lane) {
    if (typeof category !== "string" || category.trim() === "") return false;

    lane = lane === "sub" ? "sub" : "main";
    App.showScreen("s3");
    var target = findCategoryGroup(category, lane) || appendEmptyCategoryGroup(category, lane);
    if (!target) return false;

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    focusCategoryGroup(target);
    highlightCategoryGroup(target);
    return true;
  };

  function buildCompareDom(table) {
    var fragment = document.createDocumentFragment();
    if (!table || !table.columns.length) return fragment;

    var columnStyle = "84px repeat(" + table.columns.length + ", 1fr)";

    var head = document.createElement("div");
    head.className = "compare__row compare__row--head";
    head.setAttribute("role", "row");
    head.style.gridTemplateColumns = columnStyle;

    var headLab = document.createElement("span");
    headLab.className = "compare__lab";
    headLab.setAttribute("role", "columnheader");
    headLab.textContent = "項目";
    head.appendChild(headLab);

    table.columns.forEach(function (product) {
      var cell = document.createElement("span");
      cell.className = "compare__cell";
      cell.setAttribute("role", "columnheader");
      cell.textContent = product.name;
      head.appendChild(cell);
    });
    fragment.appendChild(head);

    table.rows.forEach(function (rowData) {
      var row = document.createElement("div");
      row.className = "compare__row" + (rowData.differs ? " is-diff" : "");
      row.setAttribute("role", "row");
      row.style.gridTemplateColumns = columnStyle;

      var lab = document.createElement("span");
      lab.className = "compare__lab";
      lab.setAttribute("role", "rowheader");
      lab.textContent = rowData.label;
      row.appendChild(lab);

      rowData.values.forEach(function (value) {
        var cell = document.createElement("span");
        cell.className = "compare__cell";
        cell.setAttribute("role", "cell");
        cell.textContent = value;
        row.appendChild(cell);
      });
      fragment.appendChild(row);
    });

    return fragment;
  }

  function compareHint(text) {
    var hint = $("compareHint");
    if (hint) hint.textContent = text;
  }

  var questionOpener = null;

  function closeQuestionSheet() {
    var sheet = $("questionSheet");
    if (sheet) sheet.hidden = true;
    if (questionOpener && typeof questionOpener.focus === "function") questionOpener.focus();
    questionOpener = null;
  }

  function copyQuestionText(text, copyButton) {
    var clipboard = global.navigator && global.navigator.clipboard;
    if (!clipboard || typeof clipboard.writeText !== "function") return;

    function showFallback() {
      if (copyButton) {
        copyButton.disabled = true;
        copyButton.hidden = true;
      }
      App.toast("コピーできませんでした。例文を選択してコピーしてください。");
    }

    try {
      Promise.resolve(clipboard.writeText(text)).then(function () {
        App.toast("コピーしました");
      }).catch(showFallback);
    } catch (error) {
      showFallback();
    }
  }

  function buildQuestionItem(template) {
    var item = document.createElement("li");
    item.className = "question-list__item";

    var text = document.createElement("p");
    text.className = "question-list__text";
    text.textContent = template.text;
    item.appendChild(text);

    var clipboard = global.navigator && global.navigator.clipboard;
    if (clipboard && typeof clipboard.writeText === "function") {
      var copy = document.createElement("button");
      copy.type = "button";
      copy.className = "ghost-btn question-list__copy";
      copy.textContent = "コピー";
      copy.addEventListener("click", function () { copyQuestionText(template.text, copy); });
      item.appendChild(copy);
    }

    return item;
  }

  function openQuestionSheet(diagnosis, opener) {
    var sheet = $("questionSheet");
    var list = $("questionList");
    if (!sheet || !list || typeof App.pickQuestionTemplates !== "function") return;

    questionOpener = opener || null;
    list.textContent = "";
    App.pickQuestionTemplates(diagnosis).forEach(function (template) {
      list.appendChild(buildQuestionItem(template));
    });
    sheet.hidden = false;

    var close = $("questionClose");
    if (close && typeof close.focus === "function") close.focus();
  }

  function renderQuestionHelper(diagnosis) {
    var helper = $("questionHelper");
    if (!helper || typeof App.pickQuestionTemplates !== "function") return;

    helper.textContent = "";
    var open = document.createElement("button");
    open.type = "button";
    open.className = "ghost-btn question-helper__open";
    open.textContent = "店員さんに聞くときの例文を見る";
    open.addEventListener("click", function () { openQuestionSheet(diagnosis, open); });
    helper.appendChild(open);
  }

  function renderCompareSelection(recommendation) {
    var compareEl = $("compareTable");
    if (!compareEl) return;

    compareEl.textContent = "";
    var products = recommendationProducts(recommendation).filter(function (product) {
      return product && selectedCompareIds.indexOf(product.id) !== -1;
    });

    if (products.length >= 2) {
      compareHint(products.length + "件を比較中。候補から最大3件まで選べます。");
      compareEl.appendChild(buildCompareDom(App.buildCompareTable(products.slice(0, 3))));
      return;
    }

    compareHint(products.length === 1
      ? "あと1件選ぶと比較表が表示されます。"
      : "候補から2〜3件選ぶと比較表が表示されます。");
    var note = document.createElement("p");
    note.className = "cand__note";
    note.textContent = products.length === 1
      ? "比較するもう1件を候補から選んでください。"
      : "比較する商品を候補から選んでください。";
    compareEl.appendChild(note);
  }

  /**
   * 診断結果 ＋ 選択中の予算帯 → S3の候補一覧・比較表を描画する。
   * App.recommend / App.buildCompareTable（contracts.js）を画面に結線する（Issue #61）。
   */
  App.renderS3 = function () {
    if (!state.completed) return;

    var diagnosis = state.diagnosis || App.diagnose(state.answers, { focusCategory: state.focusCategory });
    var budget = currentS3Budget();
    var meta = App.TYPE_META[diagnosis.primaryType];
    var avoided = avoidedIngredients();
    var recommendation = filterRecommendationByAvoidedIngredients(
      uniqueRecommendation(App.recommend(diagnosis, budget)), budget, avoided, diagnosis
    );

    if (selectedCompareBudget !== budget) {
      selectedCompareBudget = budget;
      selectedCompareIds = [];
    }

    var candidates = recommendationProducts(recommendation);
    selectedCompareIds = selectedCompareIds.filter(function (productId) {
      return candidates.some(function (product) { return product.id === productId; });
    });
    App.updateBudgetCount(budget, candidates.length);

    var heading = $("s3CandHeading");
    if (heading) heading.textContent = (meta ? meta.set : "商品") + "の候補";

    var avoidStatus = $("s3AvoidStatus");
    if (avoidStatus) {
      avoidStatus.hidden = avoided.length === 0;
      avoidStatus.textContent = avoided.length
        ? avoided.map(function (name) { return "「" + name + "」"; }).join("、") + "を含まない候補を表示しています（設定で変更できます）"
        : "";
    }

    var groupsEl = $("candGroups");
    if (groupsEl) {
      groupsEl.textContent = "";
      (recommendation.main || []).forEach(function (group) {
        groupsEl.appendChild(buildCandGroup(group, "main"));
      });

      if (recommendation.isComposite && recommendation.sub && recommendation.sub.length) {
        var subMeta = App.TYPE_META[diagnosis.secondaryType];
        var subNote = document.createElement("p");
        subNote.className = "sec-note";
        subNote.textContent = subMeta
          ? "「" + subMeta.name + "」向けの候補もあわせて。まずは1本ずつ試すのがおすすめです。"
          : "もう一つの傾向向けの候補もあわせて。";
        groupsEl.appendChild(subNote);

        recommendation.sub.forEach(function (group) {
          groupsEl.appendChild(buildCandGroup(group, "sub"));
        });
      }
    }

    renderCompareSelection(recommendation);
    renderQuestionHelper(diagnosis);
  };

  var questionClose = $("questionClose");
  var questionScrim = $("questionScrim");
  if (questionClose) questionClose.addEventListener("click", closeQuestionSheet);
  if (questionScrim) questionScrim.addEventListener("click", closeQuestionSheet);
  if (document.addEventListener) {
    document.addEventListener("keydown", function (event) {
      var sheet = $("questionSheet");
      if (event.key === "Tab" && sheet && !sheet.hidden) {
        var panel = sheet.querySelector('[role="dialog"]');
        if (panel) {
          var focusable = Array.prototype.slice.call(panel.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          ));
          if (!focusable.length) {
            event.preventDefault();
            panel.focus();
          } else if (event.shiftKey && document.activeElement === focusable[0]) {
            event.preventDefault();
            focusable[focusable.length - 1].focus();
          } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
            event.preventDefault();
            focusable[0].focus();
          }
        }
      }
      if (event.key === "Escape") {
        if (sheet && !sheet.hidden) closeQuestionSheet();
      }
    });
  }

  function restoreCandidateFocus(productId) {
    var buttons = qAll("[data-product-id]", $("candGroups"));
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute("data-product-id") === productId) {
        buttons[i].focus();
        return;
      }
    }
  }

  App.toggleCompareProduct = function (productId) {
    var active = document.activeElement;
    var shouldRestoreFocus = active && typeof active.getAttribute === "function" &&
      active.getAttribute("data-product-id") === productId;
    var diagnosis = state.diagnosis || App.diagnose(state.answers, { focusCategory: state.focusCategory });
    var budget = currentS3Budget();
    var recommendation = filterRecommendationByAvoidedIngredients(
      uniqueRecommendation(App.recommend(diagnosis, budget)), budget, avoidedIngredients(), diagnosis
    );
    var candidates = recommendationProducts(recommendation);
    if (!candidates.some(function (product) { return product.id === productId; })) return;

    var index = selectedCompareIds.indexOf(productId);
    if (index !== -1) {
      selectedCompareIds.splice(index, 1);
    } else if (selectedCompareIds.length >= 3) {
      App.toast("比較できるのは最大3商品までです");
      return;
    } else {
      selectedCompareIds.push(productId);
    }
    App.renderS3();
    if (shouldRestoreFocus) restoreCandidateFocus(productId);
  };
})(window);
