/* =====================================================================
   Ingredient master for fact-based display.
   Each record stores only factual presence/absence-friendly metadata.
   ===================================================================== */
(function (global) {
  "use strict";

  /**
   * @typedef {Object} Ingredient
   * @property {string} id
   * @property {string} name
   * @property {string} fact_tag
   * @property {string} note
   */

  /** @type {Ingredient[]} */
  var INGREDIENTS = [
    { id: "ceramide", name: "セラミド", fact_tag: "うるおいを与える成分", note: "保湿系の事実タグ" },
    { id: "hyaluronic-acid", name: "ヒアルロン酸", fact_tag: "うるおいを与える成分", note: "保湿系の事実タグ" },
    { id: "glycerin", name: "グリセリン", fact_tag: "うるおいを与える成分", note: "保湿系の事実タグ" },
    { id: "alcohol-free", name: "アルコールフリー", fact_tag: "アルコール不使用", note: "配合有無の表現" },
    { id: "fragrance-free", name: "無香料", fact_tag: "香料不使用", note: "配合有無の表現" },
    { id: "low-irritation", name: "低刺激", fact_tag: "配慮表示", note: "メーカー表記を事実として保持" },
    { id: "oil-free", name: "オイルフリー", fact_tag: "油分不使用", note: "配合有無の表現" },
    { id: "aminosurfactant", name: "洗浄成分", fact_tag: "洗浄成分配合", note: "洗顔料の構成要素" },
    { id: "clay", name: "クレイ", fact_tag: "吸着系の成分", note: "洗顔料の構成要素" },
    { id: "shaving-balm-base", name: "アラントイン", fact_tag: "整肌成分", note: "アフターシェーブ用の構成要素" },
    { id: "uva-uvb", name: "UVカット成分", fact_tag: "紫外線防御成分", note: "日中ケアの構成要素" },
    { id: "shea-butter", name: "シアバター", fact_tag: "油性基材", note: "乳液の構成要素" },
    { id: "moisturizing-agent", name: "保湿成分", fact_tag: "うるおいを与える成分", note: "総称タグ" }
  ];

  global.INGREDIENTS = INGREDIENTS;
})(window);
