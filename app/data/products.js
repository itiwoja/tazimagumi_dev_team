/* =====================================================================
   Product master for recommendation logic.
   MVP keeps a small, local-only dataset.
   ===================================================================== */
(function (global) {
  "use strict";

  /**
   * @typedef {Object} Product
   * @property {string} id
   * @property {string} category
   * @property {string} name
   * @property {number} price
   * @property {number} volume
   * @property {("core"|"sub")} budget
   * @property {string[]} type_tags
   * @property {string} summary_one_liner
   * @property {string} feel
   * @property {string} scent
   * @property {string[]} ingredients
   */

  /** @type {Product[]} */
  var PRODUCTS = [
    {
      id: "lotion-basic",
      category: "化粧水",
      name: "さっぱり化粧水 ベーシック",
      price: 1320,
      volume: 200,
      budget: "sub",
      type_tags: ["type1", "type6"],
      summary_one_liner: "さっぱり使えて、はじめの1本に選びやすい",
      feel: "さっぱり",
      scent: "無香料",
      ingredients: ["セラミド", "無香料", "アルコールフリー"]
    },
    {
      id: "lotion-moist",
      category: "化粧水",
      name: "うるおい化粧水 しっとり",
      price: 1480,
      volume: 180,
      budget: "sub",
      type_tags: ["type2", "type5"],
      summary_one_liner: "しっとり感を重視した、乾燥しやすい人向け",
      feel: "しっとり",
      scent: "無香料",
      ingredients: ["ヒアルロン酸", "グリセリン", "無香料", "低刺激"]
    },
    {
      id: "lotion-oilfree",
      category: "化粧水",
      name: "さらさら化粧水 オイルフリー",
      price: 990,
      volume: 150,
      budget: "sub",
      type_tags: ["type1", "type3"],
      summary_one_liner: "さっぱり系で、ベタつきやすい人に使いやすい",
      feel: "さっぱり",
      scent: "無香料",
      ingredients: ["無香料", "オイルフリー"]
    }
  ];

  global.PRODUCTS = PRODUCTS;

  /**
   * @param {("core"|"sub")} budget
   * @returns {Product[]}
   */
  global.filterProductsByBudget = function (budget) {
    if (budget === "core") return PRODUCTS.slice();
    return PRODUCTS.filter(function (p) { return p.budget === "sub"; });
  };
})(window);
