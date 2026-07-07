/* =====================================================================
   ディスクレーマー共通部品（SC-99） — 薬機法準拠の注意書き
   担当タスク: [CORE] 共有コンポーネント（Issue #40 [p4f]）
   ---------------------------------------------------------------------
   - 文言は「唯一の正」としてここに集約（DRY）。複数画面へ同一文を注入する。
   - 根拠: 診断ロジック設計書 v1.1 §8 ／ 基本設計書 v1.0 §8（確定文言）。
   - 配置: 結果(S2)・商品(S3) の最下部に常時表示（画面設計書 SC-99）。
   - 使い方: 表示したい場所に <div data-disclaimer></div> を置くだけ。
     defer 読み込みなので DOM 構築後に自動で全 [data-disclaimer] へ注入する。
   ===================================================================== */
(function (global) {
  "use strict";

  var App = global.App || (global.App = {});

  App.DISCLAIMER_HEADING = "ご注意";

  /** 確定文言（改変禁止・変更はドキュメント側の合意が必要）。 */
  App.DISCLAIMER_LINES = [
    "本診断は医学的な肌診断ではありません。ご回答内容に基づいて、楽天市場メンズスキンケア部門のランキング上位商品や、ご回答から推定される肌タイプに推奨される成分（化粧品の効能の範囲：56効能）を含む商品をご提案するものです。",
    "肌の状態に不安がある場合は、皮膚科医・薬剤師など専門家にご相談ください。",
    "本アプリは医療行為を行うものではなく、提案する商品の効能効果や安全性を保証するものでもありません。",
    "独自スコアによる成分の安全性・刺激の強さの評価は行わず、成分の有無を事実として表示するに留めます。"
  ];

  /** 1つのコンテナへ SC-99 を描画する。 */
  function render(container) {
    container.setAttribute("role", "note");
    container.setAttribute("aria-label", "薬機法に関する注意事項");
    container.textContent = "";

    var head = document.createElement("p");
    head.className = "disclaimer__head";
    head.textContent = App.DISCLAIMER_HEADING;
    container.appendChild(head);

    App.DISCLAIMER_LINES.forEach(function (line) {
      var p = document.createElement("p");
      p.className = "disclaimer__line";
      p.textContent = line;
      container.appendChild(p);
    });
  }

  /**
   * 指定範囲（既定は document 全体）の [data-disclaimer] をすべて描画する。
   * @param {ParentNode} [root]
   */
  App.mountDisclaimers = function (root) {
    var scope = root || document;
    var targets = scope.querySelectorAll("[data-disclaimer]");
    Array.prototype.forEach.call(targets, render);
  };

  App.mountDisclaimers();
})(window);
