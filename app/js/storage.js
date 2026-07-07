/* =====================================================================
   永続化ストレージ層 — localStorage ラッパ（共有モジュール）
   担当タスク: [CORE] データ永続化（Issue #58 [提案-F1]）
   ---------------------------------------------------------------------
   - 外部API非依存・ブラウザ内完結の方針に合致（localStorage のみ）。
   - プライベートモード / 容量超過 / JSON破損 でも例外を投げず握りつぶす。
   - 保存形式にバージョンを持たせ、非互換データは無視して初期状態に戻す。
   - 読み込み順（index.html）: data → state → storage → contracts → screens → main
   ===================================================================== */
(function (global) {
  "use strict";

  var App = global.App || (global.App = {});

  var KEY = "midashinami:v1";   // 名前空間:スキーマ版
  var VERSION = 1;              // state 形式を壊す変更のたびに +1

  /** localStorage が実際に読み書きできるか（プライベートモード等を検出）。 */
  function detectPersist() {
    try {
      var probe = "__midashinami_probe__";
      global.localStorage.setItem(probe, "1");
      global.localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  }

  var canPersist = detectPersist();

  App.storage = {
    /** 保存可否（UI 側で「保存されません」等の告知に使える）。 */
    canPersist: canPersist,

    /**
     * 状態を保存する。失敗しても false を返すだけで例外は投げない。
     * @param {Object} state
     * @returns {boolean} 保存できたら true
     */
    save: function (state) {
      if (!canPersist) return false;
      try {
        var payload = { v: VERSION, savedAt: Date.now(), state: state };
        global.localStorage.setItem(KEY, JSON.stringify(payload));
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * 保存済み状態を読み出す。無い/壊れている/版違いなら null。
     * @returns {Object|null}
     */
    load: function () {
      if (!canPersist) return null;
      try {
        var raw = global.localStorage.getItem(KEY);
        if (!raw) return null;
        var data = JSON.parse(raw);
        if (!data || data.v !== VERSION || !data.state) return null;
        return data.state;
      } catch (e) {
        return null;
      }
    },

    /**
     * 保存を消す（[提案-S2] 全削除機能の土台）。
     * @returns {boolean}
     */
    clear: function () {
      if (!canPersist) return false;
      try {
        global.localStorage.removeItem(KEY);
        return true;
      } catch (e) {
        return false;
      }
    }
  };
})(window);
