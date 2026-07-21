/* =====================================================================
   Shared contracts for diagnosis, roadmap, recommendation, and compare.
   Pure-function stubs are replaced by feature implementations.
   ===================================================================== */
(function (global) {
  "use strict";

  var App = global.App || (global.App = {});

  /** @typedef {Array<string|null>} Answers */
  /** @typedef {{oily:number,dry:number,inflam:number,shave:number,aging:number,beginner:number}} AxisScores */
  /** @typedef {("type1"|"type2"|"type3"|"type4"|"type5"|"type6")} SkinType */
  /**
   * @typedef {Object} Diagnosis
   * @property {SkinType} primaryType
   * @property {SkinType|null} secondaryType
   * @property {boolean} isComposite
   * @property {AxisScores} scores
   * @property {string[]} [topContributors]
   */
  /**
   * @typedef {Object} CategoryGroup
   * @property {string} category
   * @property {Product[]} products
   */
  /**
   * @typedef {Object} Recommendation
   * @property {CategoryGroup[]} main
   * @property {CategoryGroup[]|null} sub
   * @property {boolean} isComposite
   */
  /**
   * @typedef {Object} CompareRow
   * @property {string} label
   * @property {string[]} values
   * @property {boolean} differs
   */
  /**
   * @typedef {Object} CompareTable
   * @property {Product[]} columns
   * @property {CompareRow[]} rows
   */
  /**
   * @typedef {Object} RoadmapStep
   * @property {number} order
   * @property {string} title
   * @property {string} body
   * @property {string} [term]
   */

  /** @type {Record<SkinType, {name:string, axis:keyof AxisScores, set:string}>} */
  App.TYPE_META = {
    type1: { name: "皮脂が気になる", axis: "oily", set: "皮脂コントロールセット" },
    type2: { name: "乾燥しやすい", axis: "dry", set: "保湿セット" },
    type3: { name: "肌荒れしやすい", axis: "inflam", set: "肌荒れケアセット" },
    type4: { name: "髭剃り後のケアが必要", axis: "shave", set: "アフターシェーブセット" },
    type5: { name: "年齢肌が気になる", axis: "aging", set: "年齢肌ケアセット" },
    type6: { name: "まず1本から始めたい", axis: "beginner", set: "入門オールインワン1本" }
  };

  function notImplemented(fn, owner, issue, doc) {
    return function () {
      throw new Error(
        "[未実装] " + fn + " / " + owner + " / Issue " + issue + " / " + doc
      );
    };
  }

  function uniquePush(list, value) {
    if (list.indexOf(value) === -1) list.push(value);
  }

  function getTypesFromDiagnosis(diagnosis) {
    var types = [];
    if (diagnosis && diagnosis.primaryType) uniquePush(types, diagnosis.primaryType);
    if (diagnosis && diagnosis.isComposite && diagnosis.secondaryType) {
      uniquePush(types, diagnosis.secondaryType);
    }
    return types;
  }

  function getEligibleProducts(budget) {
    var source = typeof global.filterProductsByBudget === "function"
      ? global.filterProductsByBudget(budget)
      : (global.PRODUCTS || []).slice();
    return source.filter(function (product) {
      return product && Array.isArray(product.type_tags);
    });
  }

  function buildCategoryGroups(products) {
    var groups = [];
    var categoryIndex = {};

    products.forEach(function (product) {
      var category = product.category || "";
      if (!Object.prototype.hasOwnProperty.call(categoryIndex, category)) {
        categoryIndex[category] = groups.length;
        groups.push({ category: category, products: [] });
      }
      var group = groups[categoryIndex[category]];
      if (group.products.length < 3) {
        group.products.push(product);
      }
    });

    return groups;
  }

  function pickCandidatesForType(type, budget) {
    var filtered = getEligibleProducts(budget).filter(function (product) {
      return product.type_tags.indexOf(type) !== -1;
    });

    filtered.sort(function (a, b) {
      var aHasSummary = a.summary_one_liner ? 1 : 0;
      var bHasSummary = b.summary_one_liner ? 1 : 0;
      if (aHasSummary !== bHasSummary) return bHasSummary - aHasSummary;
      if (a.price !== b.price) return a.price - b.price;
      return (b.volume || 0) - (a.volume || 0);
    });

    return buildCategoryGroups(filtered);
  }

  /**
   * @param {Answers} answers
   * @returns {Diagnosis}
   */
  App.diagnose = notImplemented(
    "App.diagnose", "ひろと", "#33", "docs/specs/診断ロジック設計書_v1.1.md"
  );

  /**
   * @param {Diagnosis} diagnosis
   * @returns {RoadmapStep[]}
   */
  App.buildRoadmap = notImplemented(
    "App.buildRoadmap", "ひろと", "#35", "docs/specs/診断ロジック設計書_v1.1.md"
  );

  /**
   * @param {Diagnosis} diagnosis
   * @param {("core"|"sub")} budget
   * @returns {Recommendation}
   */
  App.recommend = function (diagnosis, budget) {
    var types = getTypesFromDiagnosis(diagnosis);
    var mainType = types[0] || null;
    var subType = types[1] || null;
    var isComposite = !!(diagnosis && diagnosis.isComposite && subType);
    var main = mainType ? pickCandidatesForType(mainType, budget) : [];
    var sub = isComposite ? pickCandidatesForType(subType, budget) : null;

    return {
      main: main,
      sub: sub,
      isComposite: isComposite
    };
  };

  /**
   * @param {Product[]} products
   * @returns {CompareTable}
   */
  App.buildCompareTable = notImplemented(
    "App.buildCompareTable", "ゆうと", "#38", "docs/design/推薦ロジック仕様書_v1.0.md §4"
  );
})(window);
