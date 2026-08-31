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
      }).filter(function (group) {
        return group.products.length > 0;
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
      group.products.forEach(function (product, index) {
        ul.appendChild(buildCandItem(product, index === 0));
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

    var diagnosis = state.diagnosis || App.diagnose(state.answers);
    var budget = currentS3Budget();
    var meta = App.TYPE_META[diagnosis.primaryType];
    var recommendation = uniqueRecommendation(App.recommend(diagnosis, budget));

    if (selectedCompareBudget !== budget) {
      selectedCompareBudget = budget;
      selectedCompareIds = [];
    }

    App.updateBudgetCount(budget, recommendationProducts(recommendation).length);

    var heading = $("s3CandHeading");
    if (heading) heading.textContent = (meta ? meta.set : "商品") + "の候補";

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
  };

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
    var diagnosis = state.diagnosis || App.diagnose(state.answers);
    var budget = currentS3Budget();
    var recommendation = uniqueRecommendation(App.recommend(diagnosis, budget));
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
