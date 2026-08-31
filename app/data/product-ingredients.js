/* =====================================================================
   Product ↔ ingredient fact map.
   `present` is a factual yes/no flag only.
   ===================================================================== */
(function (global) {
  "use strict";

  /**
   * @typedef {Object} ProductIngredient
   * @property {string} product_id
   * @property {string} ingredient_id
   * @property {boolean} present
   */

  /** @type {ProductIngredient[]} */
  var PRODUCT_INGREDIENTS = [
    { product_id: "lotion-basic", ingredient_id: "ceramide", present: true },
    { product_id: "lotion-basic", ingredient_id: "hyaluronic-acid", present: false },
    { product_id: "lotion-basic", ingredient_id: "glycerin", present: false },
    { product_id: "lotion-basic", ingredient_id: "alcohol-free", present: true },
    { product_id: "lotion-basic", ingredient_id: "fragrance-free", present: true },
    { product_id: "lotion-basic", ingredient_id: "low-irritation", present: false },

    { product_id: "lotion-moist", ingredient_id: "ceramide", present: false },
    { product_id: "lotion-moist", ingredient_id: "hyaluronic-acid", present: true },
    { product_id: "lotion-moist", ingredient_id: "glycerin", present: true },
    { product_id: "lotion-moist", ingredient_id: "alcohol-free", present: false },
    { product_id: "lotion-moist", ingredient_id: "fragrance-free", present: true },
    { product_id: "lotion-moist", ingredient_id: "low-irritation", present: true },

    { product_id: "lotion-oilfree", ingredient_id: "ceramide", present: false },
    { product_id: "lotion-oilfree", ingredient_id: "hyaluronic-acid", present: false },
    { product_id: "lotion-oilfree", ingredient_id: "glycerin", present: false },
    { product_id: "lotion-oilfree", ingredient_id: "alcohol-free", present: false },
    { product_id: "lotion-oilfree", ingredient_id: "fragrance-free", present: true },
    { product_id: "lotion-oilfree", ingredient_id: "oil-free", present: true },

    { product_id: "facewash-basic", ingredient_id: "aminosurfactant", present: true },
    { product_id: "facewash-basic", ingredient_id: "clay", present: false },
    { product_id: "facewash-basic", ingredient_id: "fragrance-free", present: true },
    { product_id: "facewash-basic", ingredient_id: "low-irritation", present: true },

    { product_id: "facewash-moist", ingredient_id: "aminosurfactant", present: true },
    { product_id: "facewash-moist", ingredient_id: "glycerin", present: true },
    { product_id: "facewash-moist", ingredient_id: "fragrance-free", present: true },
    { product_id: "facewash-moist", ingredient_id: "low-irritation", present: true },

    { product_id: "facewash-oilcut", ingredient_id: "aminosurfactant", present: false },
    { product_id: "facewash-oilcut", ingredient_id: "clay", present: true },
    { product_id: "facewash-oilcut", ingredient_id: "fragrance-free", present: true },

    { product_id: "milk-basic", ingredient_id: "ceramide", present: true },
    { product_id: "milk-basic", ingredient_id: "hyaluronic-acid", present: false },
    { product_id: "milk-basic", ingredient_id: "glycerin", present: false },
    { product_id: "milk-basic", ingredient_id: "fragrance-free", present: true },
    { product_id: "milk-basic", ingredient_id: "alcohol-free", present: true },

    { product_id: "milk-rich", ingredient_id: "ceramide", present: false },
    { product_id: "milk-rich", ingredient_id: "hyaluronic-acid", present: true },
    { product_id: "milk-rich", ingredient_id: "glycerin", present: false },
    { product_id: "milk-rich", ingredient_id: "fragrance-free", present: true },
    { product_id: "milk-rich", ingredient_id: "shea-butter", present: true },

    { product_id: "allinone-basic", ingredient_id: "ceramide", present: true },
    { product_id: "allinone-basic", ingredient_id: "hyaluronic-acid", present: false },
    { product_id: "allinone-basic", ingredient_id: "glycerin", present: false },
    { product_id: "allinone-basic", ingredient_id: "fragrance-free", present: true },
    { product_id: "allinone-basic", ingredient_id: "moisturizing-agent", present: true },

    { product_id: "allinone-moist", ingredient_id: "ceramide", present: false },
    { product_id: "allinone-moist", ingredient_id: "hyaluronic-acid", present: true },
    { product_id: "allinone-moist", ingredient_id: "glycerin", present: true },
    { product_id: "allinone-moist", ingredient_id: "fragrance-free", present: true },
    { product_id: "allinone-moist", ingredient_id: "moisturizing-agent", present: true },

    { product_id: "sunscreen-basic", ingredient_id: "uva-uvb", present: true },
    { product_id: "sunscreen-basic", ingredient_id: "fragrance-free", present: true },
    { product_id: "sunscreen-basic", ingredient_id: "low-irritation", present: true },

    { product_id: "sunscreen-moist", ingredient_id: "uva-uvb", present: true },
    { product_id: "sunscreen-moist", ingredient_id: "hyaluronic-acid", present: true },
    { product_id: "sunscreen-moist", ingredient_id: "fragrance-free", present: true },

    { product_id: "aftershave-gel", ingredient_id: "shaving-balm-base", present: true },
    { product_id: "aftershave-gel", ingredient_id: "fragrance-free", present: true },
    { product_id: "aftershave-gel", ingredient_id: "low-irritation", present: true },

    { product_id: "aftershave-balm", ingredient_id: "shaving-balm-base", present: false },
    { product_id: "aftershave-balm", ingredient_id: "ceramide", present: true },
    { product_id: "aftershave-balm", ingredient_id: "fragrance-free", present: true },
    { product_id: "aftershave-balm", ingredient_id: "low-irritation", present: true },

    { product_id: "starter-kit", ingredient_id: "ceramide", present: true },
    { product_id: "starter-kit", ingredient_id: "hyaluronic-acid", present: true },
    { product_id: "starter-kit", ingredient_id: "glycerin", present: true },
    { product_id: "starter-kit", ingredient_id: "fragrance-free", present: true },
    { product_id: "starter-kit", ingredient_id: "moisturizing-agent", present: true },

    { product_id: "balanced-lotion", ingredient_id: "ceramide", present: true },
    { product_id: "balanced-lotion", ingredient_id: "hyaluronic-acid", present: true },
    { product_id: "balanced-lotion", ingredient_id: "fragrance-free", present: true },
    { product_id: "balanced-lotion", ingredient_id: "moisturizing-agent", present: true }
  ];

  global.PRODUCT_INGREDIENTS = PRODUCT_INGREDIENTS;
})(window);
