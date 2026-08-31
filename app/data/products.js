/* =====================================================================
   Product master for recommendation logic.
   MVP keeps a small, local-only dataset.
   ===================================================================== */
(function (global) {
  "use strict";

  /**
   * @typedef {Object} Product
   * @property {string} id           一意ID
   * @property {string} category     カテゴリ（例: "化粧水"）
   * @property {string} name         商品名
   * @property {number} price        税込価格(円)
   * @property {number} volume       容量(mL)
   * @property {("core"|"sub")} budget 予算帯
   * @property {string} feel         使用感（メーカー表記の事実: "さっぱり" など）
   * @property {string} scent        香り（"無香料" など事実）
   * @property {string[]} ingredients 配合成分タグ（有無の事実のみ）
   * @property {string[]} typeTags    向く肌タイプ（type1〜type6・複数可）。
   *                                   タイプ分類の事実のみ。効能/安全性の断定はしない。
   *                                   契約: js/contracts.js の SkinType / App.TYPE_META と一致。
   *                                   type1 皮脂 / type2 乾燥 / type3 炎症・肌荒れ /
   *                                   type4 髭剃り後 / type5 加齢 / type6 入門
   * @property {string} summary_one_liner 初心者向け「違いの一言」
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
      typeTags: ["type1", "type6"],
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
      typeTags: ["type2", "type5"],
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
      typeTags: ["type1", "type3"],
      summary_one_liner: "さっぱり系で、ベタつきやすい人に使いやすい",
      feel: "さっぱり",
      scent: "無香料",
      ingredients: ["無香料", "オイルフリー"]
    },
    {
      id: "facewash-basic",
      category: "洗顔料",
      name: "マイルド洗顔フォーム",
      price: 980,
      volume: 120,
      budget: "sub",
      typeTags: ["type1", "type3"],
      summary_one_liner: "毎日使いやすい、基本の洗顔フォーム",
      feel: "すっきり",
      scent: "無香料",
      ingredients: ["洗浄成分", "無香料", "低刺激"]
    },
    {
      id: "facewash-moist",
      category: "洗顔料",
      name: "しっとり洗顔ジェル",
      price: 1280,
      volume: 130,
      budget: "sub",
      typeTags: ["type2", "type5"],
      summary_one_liner: "洗い上がりのつっぱり感を抑えたい人向け",
      feel: "しっとり",
      scent: "無香料",
      ingredients: ["保湿成分", "無香料", "低刺激"]
    },
    {
      id: "facewash-oilcut",
      category: "洗顔料",
      name: "オイルコントロール洗顔",
      price: 1180,
      volume: 110,
      budget: "sub",
      typeTags: ["type1"],
      summary_one_liner: "皮脂の多い朝にも使いやすい",
      feel: "さっぱり",
      scent: "無香料",
      ingredients: ["クレイ", "無香料"]
    },
    {
      id: "milk-basic",
      category: "乳液",
      name: "ライト乳液 ベーシック",
      price: 1480,
      volume: 150,
      budget: "sub",
      typeTags: ["type2", "type6"],
      summary_one_liner: "軽めの使い心地で、保湿を足しやすい",
      feel: "なじみやすい",
      scent: "無香料",
      ingredients: ["セラミド", "無香料", "アルコールフリー"]
    },
    {
      id: "milk-rich",
      category: "乳液",
      name: "リッチ乳液 モイスト",
      price: 1680,
      volume: 140,
      budget: "core",
      typeTags: ["type2", "type5"],
      summary_one_liner: "乾燥しやすい季節に使いやすい",
      feel: "しっとり",
      scent: "無香料",
      ingredients: ["ヒアルロン酸", "シアバター", "無香料"]
    },
    {
      id: "allinone-basic",
      category: "オールインワン",
      name: "オールインワン ジェル",
      price: 1480,
      volume: 180,
      budget: "sub",
      typeTags: ["type6", "type1"],
      summary_one_liner: "まず1本で整えたい人に使いやすい",
      feel: "さっぱり",
      scent: "無香料",
      ingredients: ["セラミド", "無香料", "保湿成分"]
    },
    {
      id: "allinone-moist",
      category: "オールインワン",
      name: "高保湿オールインワン",
      price: 1980,
      volume: 170,
      budget: "core",
      typeTags: ["type2", "type5", "type6"],
      summary_one_liner: "乾燥対策をまとめて済ませやすい",
      feel: "しっとり",
      scent: "無香料",
      ingredients: ["ヒアルロン酸", "グリセリン", "無香料"]
    },
    {
      id: "sunscreen-basic",
      category: "日焼け止め",
      name: "UVカット ミルク",
      price: 1580,
      volume: 60,
      budget: "core",
      typeTags: ["type3", "type6"],
      summary_one_liner: "日中のケアを手早く足しやすい",
      feel: "さらっと",
      scent: "無香料",
      ingredients: ["UVカット成分", "無香料", "低刺激"]
    },
    {
      id: "sunscreen-moist",
      category: "日焼け止め",
      name: "しっとりUVジェル",
      price: 1780,
      volume: 70,
      budget: "core",
      typeTags: ["type2", "type5"],
      summary_one_liner: "乾燥感を気にしやすい日に使いやすい",
      feel: "みずみずしい",
      scent: "無香料",
      ingredients: ["UVカット成分", "ヒアルロン酸", "無香料"]
    },
    {
      id: "aftershave-gel",
      category: "アフターシェーブ",
      name: "アフターシェーブ ジェル",
      price: 1380,
      volume: 100,
      budget: "sub",
      typeTags: ["type4", "type3"],
      summary_one_liner: "髭剃り後に使いやすい軽めのジェル",
      feel: "ひんやり",
      scent: "無香料",
      ingredients: ["アラントイン", "無香料", "低刺激"]
    },
    {
      id: "aftershave-balm",
      category: "アフターシェーブ",
      name: "アフターシェーブ バーム",
      price: 1680,
      volume: 80,
      budget: "core",
      typeTags: ["type4", "type2"],
      summary_one_liner: "剃った後の保湿をやさしく補いやすい",
      feel: "なじみやすい",
      scent: "無香料",
      ingredients: ["セラミド", "無香料", "低刺激"]
    },
    {
      id: "balanced-lotion",
      category: "化粧水",
      name: "バランス化粧水",
      price: 2200,
      volume: 200,
      budget: "core",
      typeTags: ["type1", "type2", "type6"],
      summary_one_liner: "皮脂と乾燥の両方を意識しやすい",
      feel: "バランス型",
      scent: "無香料",
      ingredients: ["セラミド", "ヒアルロン酸", "無香料"]
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
