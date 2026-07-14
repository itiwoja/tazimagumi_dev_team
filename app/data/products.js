/* =====================================================================
   商品データ（手動整備マスター） — F-03/F-04/F-05 の土台
   担当タスク: [DATA] 商品データ整備（30-50件・成分タグ）
   ---------------------------------------------------------------------
   方針（要件定義書 REQ-03/05 / 機能定義書 F-05）:
   - 成分は「配合の有無」という事実のみ。安全/危険・効く/効かないは書かない。
   - 効能の断定表現（効く・治る・最適 等）は禁止（薬機法）。
   - 予算帯は core(〜5,000円) / sub(〜1,500円) の2区分。
   - グローバル window.PRODUCTS として読み込む（ビルド不要）。
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
      feel: "さっぱり",
      scent: "無香料",
      ingredients: ["セラミド配合", "無香料", "アルコールフリー"],
      typeTags: ["type1", "type4", "type6"],
      summary_one_liner: "さっぱりうるおう、ベタつかない定番"
    },
    {
      id: "lotion-moist",
      category: "化粧水",
      name: "うるおい化粧水 しっとり",
      price: 1480,
      volume: 180,
      budget: "sub",
      feel: "しっとり",
      scent: "無香料",
      ingredients: ["ヒアルロン酸配合", "グリセリン配合", "無香料", "弱酸性"],
      typeTags: ["type2", "type3", "type5"],
      summary_one_liner: "乾燥肌にしっとりなじむ高保湿処方"
    },
    {
      id: "lotion-oilfree",
      category: "化粧水",
      name: "さらさら化粧水 オイルフリー",
      price: 990,
      volume: 150,
      budget: "sub",
      feel: "さっぱり",
      scent: "無香料",
      ingredients: ["無香料", "オイルフリー"],
      typeTags: ["type1", "type3"],
      summary_one_liner: "皮脂テカリを防ぐオイルフリー化粧水"
    }
    // [DATA] ここに商品を追加していく（化粧水/洗顔/乳液/日焼け止め 等で30-50件）
  ];

  global.PRODUCTS = PRODUCTS;

  /**
   * 予算帯でしぼり込む。
   * @param {("core"|"sub")} budget
   * @returns {Product[]}
   */
  global.filterProductsByBudget = function (budget) {
    if (budget === "core") return PRODUCTS.slice(); // core は全件が対象(〜5,000円)
    return PRODUCTS.filter(function (p) { return p.budget === "sub"; });
  };
})(window);
