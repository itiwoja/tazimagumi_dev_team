/* =====================================================================
   機能IF（型）定義 — ロジック担当の作業場所（Issue #23 [p1g]）
   ---------------------------------------------------------------------
   ここは「各機能が受け渡しするデータの形（型）」と「実装すべき関数の枠」
   をまとめた“契約”ファイルです。各担当はこれを見れば、相手の実装を待たずに
   自分の関数を書き始められます。

   ■ ルール
   - 上半分の【型定義】は共有の約束。原則 変更しない（変えたい時は村上に相談）。
   - 下半分の【実装スタブ】は、自分の担当関数の中身だけ書き換える。
     未実装のまま呼ぶと throw して「誰の・どのIssueか」が分かるようにしてある。
   - 読み込み順（index.html）: products → state → storage → contracts → disclaimer → screens → main

   ■ 実装状況（2026-07 時点）
   - App.diagnose      : 実装済み（本ファイル下部）。
   - App.buildRoadmap  : 未実装スタブ（Issue #35 / PR #104 で対応中）
   - App.recommend     : 実装済み（本ファイル下部。商品 typeTags = Issue #54）
   - App.buildCompareTable : 未実装スタブ（Issue #38）
   - 既知の乖離: 現行UIは最小5問だが diagnose の pointTable は診断ロジック設計書の23問index前提。
     5問UIへの結線は feature/diagnosis-wiring ブランチで統合済み。23問化の統合は別 feature ブランチ（Issue #59）で対応予定。

   ■ 未統合（TODO・別ブランチ）
   - 23問へのUI拡張（Issue #59）。
   - Diagnosis.topContributors（型定義・設計書§4 Step7）は現状 diagnose が返していない（MVPでは省略し、23問拡張時に対応予定）。

   ■ 根拠ドキュメント
   - 診断:  docs/specs/診断ロジック設計書_v1.1.md
   - 推薦:  docs/design/推薦ロジック仕様書_v1.0.md
   - 商品:  docs/design/商品マスタ設計書_v1.0.md
   ===================================================================== */
(function (global) {
  "use strict";

  var App = global.App || (global.App = {});

  /* =====================================================================
     【型定義】 共有の約束（変更しない）
     ===================================================================== */

  /**
   * 初回チェック(S1)の回答。各要素は選んだ選択肢ラベル（未回答は null）。
   * 何問にするか・各問がどの軸に加点するかは diagnose 側の実装詳細。
   * @typedef {Array<string|null>} Answers
   */

  /** 6軸スコア（各 0〜100 の整数）。診断ロジック設計書 §2。
   * @typedef {Object} AxisScores
   * @property {number} oily     皮脂(S_oily)
   * @property {number} dry      乾燥(S_dry)
   * @property {number} inflam   炎症(S_inflam)
   * @property {number} shave    髭剃り(S_shave)
   * @property {number} aging    加齢(S_aging)
   * @property {number} beginner 初心者度(S_beginner)
   */

  /** 6タイプID。商品の typeTags と一致させる。
   * @typedef {("type1"|"type2"|"type3"|"type4"|"type5"|"type6")} SkinType
   */

  /** 診断結果。診断ロジック設計書 §10 の結果オブジェクトに準拠。
   * @typedef {Object} Diagnosis
   * @property {SkinType}      primaryType    第一タイプ
   * @property {SkinType|null} secondaryType  第二タイプ（複合でなければ null）
   * @property {boolean}       isComposite    複合タイプか（第1・第2の差が10pt以内）
   * @property {AxisScores}    scores         軸別スコア（判定根拠）
   * @property {string[]}     [topContributors] 上位軸に効いた質問など（任意。MVPでは省略、23問拡張時に実装予定）
   */

  /** 推薦の1グループ（概念=categoryごと）。
   * @typedef {Object} CategoryGroup
   * @property {string}    category  概念（例: "化粧水"）
   * @property {Product[]} products  その概念の候補（MVPは各最大3件）
   */

  /** 推薦結果。推薦ロジック仕様書 §1。
   * @typedef {Object} Recommendation
   * @property {CategoryGroup[]}      main        メイン推薦（第一タイプ）
   * @property {CategoryGroup[]|null} sub         サブ推薦（複合時の第二タイプ。無ければ null）
   * @property {boolean}              isComposite 複合表示か
   */

  /** 比較表の1行。推薦ロジック仕様書 §4。
   * @typedef {Object} CompareRow
   * @property {string}   label   行ラベル（例: "価格", "容量", "成分: ヒアルロン酸"）
   * @property {string[]} values  各商品の値（columns と同じ並び）
   * @property {boolean}  differs 値が分かれる行か（UIで強調する用）
   */

  /** 比較表。最大3商品を横並び。
   * @typedef {Object} CompareTable
   * @property {Product[]}    columns 比較対象の商品（最大3）
   * @property {CompareRow[]} rows    比較軸の行
   */

  /** ロードマップの1ステップ。機能定義書 F-02。
   * @typedef {Object} RoadmapStep
   * @property {number}  order  並び順（1始まり）
   * @property {string}  title  見出し（例: "まず1本：化粧水"）
   * @property {string}  body   やさしい説明文（断定表現は使わない）
   * @property {string} [term] 用語シートのキー（あれば「○○ってなに？」を出す）
   */

  /**
   * 6タイプのメタ情報（タイプ名・対応軸・推薦セット名）。
   * 診断ロジック設計書 §2 の表。表示や推薦の見出しに使う共有定数。
   * @type {Record<SkinType, {name: string, axis: keyof AxisScores, set: string}>}
   */
  App.TYPE_META = {
    type1: { name: "テカリ・皮脂が気になる",        axis: "oily",     set: "皮脂コントロールセット" },
    type2: { name: "乾燥・カサつきをなんとかしたい", axis: "dry",      set: "高保湿セット" },
    type3: { name: "ニキビ・肌荒れを防ぎたい",       axis: "inflam",   set: "低刺激・鎮静ケアセット" },
    type4: { name: "ひげ剃り後の荒れを防ぎたい",     axis: "shave",    set: "アフターシェーブセット" },
    type5: { name: "くすみ・エイジングが気になる",   axis: "aging",    set: "年齢肌ケアセット" },
    type6: { name: "とにかく始めたい（入門）",       axis: "beginner", set: "入門オールインワン1本" }
  };

  /* =====================================================================
     【実装スタブ】 自分の担当関数の中身だけ書き換える
     （未実装のまま呼ばれたら、誰が・どのIssueかを示して throw する）
     ===================================================================== */

  function notImplemented(fn, owner, issue, doc) {
    return function () {
      throw new Error(
        "[未実装] " + fn + " — 担当: " + owner + " / Issue " + issue +
        "（参照: " + doc + "）"
      );
    };
  }

  /**
   * 初回チェックの回答 → 診断結果。診断ロジック設計書 §4 の判定アルゴリズム。
   * 担当: ひろと / Issue #33 [p4b] 診断ロジック（純粋関数）
   * @param {Answers} answers
   * @returns {Diagnosis}
   */
  App.diagnose = function(answers) {
    var scores = {
      oily: 0,
      dry: 0,
      inflam: 0,
      shave: 0,
      aging: 0,
      beginner: 0
    };

    var axisToTypeMap = {
      oily: "type1",
      dry: "type2",
      inflam: "type3",
      shave: "type4",
      aging: "type5",
      beginner: "type6"
    };
    var priorityOrder = ["shave", "inflam", "oily", "dry", "aging", "beginner"];
    var q9Axes = [];

    function normalize(value) {
      return String(value).replace(/\s+/g, "").trim();
    }

    function asList(value) {
      if (value === null || value === undefined) return [];
      return Array.isArray(value) ? value : [value];
    }

    function add(axis, point) {
      scores[axis] += point;
    }

    function addMany(items) {
      items.forEach(function(item) {
        add(item.axis, item.point);
      });
    }

    function axisItems(axes, point) {
      return axes.map(function(axis) {
        return { axis: axis, point: point };
      });
    }

    function buildQ9Items(label) {
      var q9Map = {
        "テカリ・皮脂": ["oily"],
        "乾燥・カサつき": ["dry"],
        "ニキビ・吹き出物": ["inflam"],
        "髭剃り後の荒れ": ["shave"],
        "ひげ剃り後の荒れ": ["shave"],
        "くすみ・トーンの暗さ": ["aging"],
        "くすみ": ["aging"],
        "シワ・たるみ": ["aging"],
        "シワ": ["aging"],
        "毛穴の黒ずみ": ["oily"],
        "赤み・ヒリつき": ["inflam"],
        "特にない": ["beginner"]
      };
      var pointMap = {
        "シワ・たるみ": 20,
        "シワ": 20,
        "毛穴の黒ずみ": 10,
        "赤み・ヒリつき": 20
      };
      var axes = q9Map[label] || [];
      return axisItems(axes, pointMap[label] || 15);
    }

    var fallbackScores = {
      "テカリ・ベタつき": [{ axis: "oily", point: 30 }],
      "乾燥・つっぱり": [{ axis: "dry", point: 30 }],
      "ニキビ・赤み": [{ axis: "inflam", point: 30 }],
      "ヒリヒリ・赤くなる": [{ axis: "shave", point: 30 }, { axis: "inflam", point: 15 }],
      "あまり剃らない": [],
      "ペタッとする": [{ axis: "oily", point: 10 }],
      "パサつく・広がる": [{ axis: "dry", point: 10 }],
      "〜1,500円": [{ axis: "beginner", point: 10 }],
      "～1,500円": [{ axis: "beginner", point: 10 }],
      "〜5,000円": [],
      "まだ決めてない": [{ axis: "beginner", point: 5 }],
      "朝だけ": [{ axis: "beginner", point: 10 }],
      "夜だけ": [{ axis: "beginner", point: 10 }],
      "朝も夜もいける": [],
      "自信がない": [{ axis: "beginner", point: 15 }],
      "まだわからない": [{ axis: "beginner", point: 10 }]
    };

    var pointTable = [
      {
        "15〜19歳": [],
        "20〜25歳": [],
        "26〜35歳": [{ axis: "aging", point: 10 }],
        "36〜45歳": [{ axis: "aging", point: 30 }],
        "46歳以上": [{ axis: "aging", point: 50 }, { axis: "dry", point: 10 }]
      },
      {
        "男性": [],
        "それ以外": []
      },
      {
        "毎日": [{ axis: "shave", point: 30 }],
        "週3〜5回": [{ axis: "shave", point: 20 }],
        "週1〜2回": [{ axis: "shave", point: 10 }],
        "ほぼ剃らない／脱毛済": [],
        "ひげが生えない": []
      },
      {
        "全体的にベタつく・テカる": [{ axis: "oily", point: 30 }],
        "全体的にベタつく": [{ axis: "oily", point: 30 }],
        "額や鼻だけテカる（部分的）": [{ axis: "oily", point: 15 }, { axis: "dry", point: 10 }],
        "部分的にテカる": [{ axis: "oily", point: 15 }, { axis: "dry", point: 10 }],
        "全体的にかさつく・つっぱる": [{ axis: "dry", point: 30 }],
        "ヒリつく・赤みが出る": [{ axis: "inflam", point: 30 }],
        "特に何も感じない": [{ axis: "beginner", point: 10 }]
      },
      {
        "夏に特にテカる": [{ axis: "oily", point: 10 }],
        "冬に特にかさつく": [{ axis: "dry", point: 15 }],
        "季節の変わり目に荒れる": [{ axis: "inflam", point: 20 }],
        "季節を問わず常に調子が悪い": [{ axis: "inflam", point: 15 }, { axis: "dry", point: 10 }],
        "あまり変わらない": [{ axis: "beginner", point: 5 }]
      },
      {
        "黒ずみが目立つ": [{ axis: "oily", point: 25 }],
        "開いている感じがする": [{ axis: "oily", point: 15 }],
        "鼻のあたりだけ目立つ": [{ axis: "oily", point: 10 }],
        "気にならない": []
      },
      {
        "とても多い": [{ axis: "oily", point: 25 }],
        "多い": [{ axis: "oily", point: 15 }],
        "普通": [],
        "少ない・乾く": [{ axis: "dry", point: 10 }]
      },
      {
        "かさつく・粉ふきする": [{ axis: "dry", point: 25 }],
        "油分が多い": [{ axis: "oily", point: 15 }],
        "赤みがある": [{ axis: "inflam", point: 20 }],
        "普通": []
      },
      null,
      {
        "最近（1〜3ヶ月以内）": [],
        "半年〜1年前から": "q9+5",
        "何年も継続している": "q9+10",
        "何年も継続": "q9+10",
        "子供の頃から": [{ axis: "inflam", point: 10 }]
      },
      {
        "額・Tゾーン中心": [{ axis: "oily", point: 10 }],
        "頬中心": [{ axis: "inflam", point: 10 }],
        "顎・口周り中心": [{ axis: "shave", point: 10 }],
        "全体に出る": [{ axis: "inflam", point: 15 }],
        "出ない": []
      },
      {
        "毎日のように悩む": [{ axis: "inflam", point: 15 }],
        "月に数回": [{ axis: "inflam", point: 5 }],
        "季節限定で気になる": "q9+5",
        "たまに気になる程度": [],
        "ほとんど気にならない": [{ axis: "beginner", point: 5 }]
      },
      {
        "剃った直後すぐ出る": [{ axis: "shave", point: 30 }, { axis: "inflam", point: 15 }],
        "剃った直後すぐ": [{ axis: "shave", point: 30 }, { axis: "inflam", point: 15 }],
        "数時間後に出る": [{ axis: "shave", point: 20 }],
        "数時間後に赤み": [{ axis: "shave", point: 20 }],
        "翌日に出ることがある": [{ axis: "shave", point: 10 }],
        "特に赤みは出ない": []
      },
      {
        "T字カミソリ（多刃）": [{ axis: "shave", point: 10 }],
        "T字（多刃）": [{ axis: "shave", point: 10 }],
        "電気シェーバー": [{ axis: "shave", point: 5 }],
        "I字カミソリ（クラシック・両刃）": [{ axis: "shave", point: 15 }],
        "脱毛器を使用": [],
        "医療脱毛済": []
      },
      {
        "濃い・剛毛": [{ axis: "shave", point: 20 }],
        "普通": [{ axis: "shave", point: 10 }],
        "薄い": [{ axis: "shave", point: 5 }],
        "ほとんど生えない": []
      },
      {
        "顎・口周りのみ": [{ axis: "shave", point: 5 }],
        "顎・口周り＋頬の一部": [{ axis: "shave", point: 10 }],
        "全顔（広範囲）": [{ axis: "shave", point: 15 }],
        "全顔": [{ axis: "shave", point: 15 }],
        "顔以外（首・胸・足など）も含む": [{ axis: "shave", point: 20 }]
      },
      {
        "朝のみ": [{ axis: "shave", point: 10 }],
        "夜のみ": [{ axis: "shave", point: 5 }],
        "朝・夜の両方": [{ axis: "shave", point: 15 }],
        "朝・夜両方": [{ axis: "shave", point: 15 }],
        "不定期": [{ axis: "shave", point: 5 }]
      },
      {
        "5時間未満": [{ axis: "inflam", point: 10 }, { axis: "aging", point: 10 }],
        "5〜6時間": [{ axis: "inflam", point: 5 }, { axis: "aging", point: 5 }],
        "7〜8時間": [],
        "8時間以上": []
      },
      {
        "脂っこいもの中心": [{ axis: "oily", point: 10 }, { axis: "inflam", point: 5 }],
        "バランスを意識している": [],
        "野菜中心": [],
        "不規則・コンビニ中心": [{ axis: "oily", point: 5 }, { axis: "inflam", point: 10 }]
      },
      {
        "ほぼ毎日": [],
        "週2〜3回": [],
        "週1回程度": [],
        "ほとんどしない": [{ axis: "aging", point: 5 }]
      },
      {
        "全くやったことがない": [{ axis: "beginner", point: 30 }],
        "洗顔のみ": [{ axis: "beginner", point: 25 }],
        "化粧水まで使っている": [{ axis: "beginner", point: 15 }],
        "化粧水まで": [{ axis: "beginner", point: 15 }],
        "化粧水＋乳液（または保湿）": [{ axis: "beginner", point: 5 }],
        "数年以上ルーティン化している": []
      },
      {
        "30秒以内（オールインワンが好み）": [{ axis: "beginner", point: 10 }],
        "30秒以内": [{ axis: "beginner", point: 10 }],
        "1〜3分": [{ axis: "beginner", point: 5 }],
        "3〜5分": [],
        "5分以上かけてもよい": []
      },
      {
        "〜1,500円": [{ axis: "beginner", point: 10 }],
        "～1,500円": [{ axis: "beginner", point: 10 }],
        "1,500〜3,000円": [],
        "3,000〜5,000円": [],
        "5,000〜10,000円": [{ axis: "aging", point: 5 }],
        "10,000円以上": [{ axis: "aging", point: 10 }]
      }
    ];

    if (Array.isArray(answers)) {
      answers.forEach(function(answer, index) {
        asList(answer).forEach(function(rawLabel) {
          var label = normalize(rawLabel);
          var items;

          if (index === 8) {
            items = buildQ9Items(label);
            q9Axes = q9Axes.concat(items.map(function(item) { return item.axis; }));
          } else if (pointTable[index] && pointTable[index][label]) {
            items = pointTable[index][label];
            if (items === "q9+5") items = axisItems(q9Axes, 5);
            if (items === "q9+10") items = axisItems(q9Axes, 10);
          } else {
            items = fallbackScores[label] || [];
          }

          addMany(items);
        });
      });
    }

    Object.keys(scores).forEach(function(key) {
      scores[key] = Math.max(0, Math.min(100, scores[key]));
    });

    var maxScore = -1;
    priorityOrder.forEach(function(axis) {
      if (scores[axis] > maxScore) maxScore = scores[axis];
    });

    var primaryType = "type6";
    var secondaryType = null;
    var isComposite = false;

    if (scores.beginner < 60 && maxScore >= 30) {
      var bestAxis = priorityOrder[0];
      var secondAxis = null;
      var bestScore = -1;
      var secondBestScore = -1;

      priorityOrder.forEach(function(axis) {
        var score = scores[axis];
        if (score > bestScore) {
          secondBestScore = bestScore;
          secondAxis = bestAxis;
          bestScore = score;
          bestAxis = axis;
        } else if (score > secondBestScore) {
          secondBestScore = score;
          secondAxis = axis;
        }
      });

      primaryType = axisToTypeMap[bestAxis];
      if (secondAxis && secondAxis !== "beginner" && (bestScore - secondBestScore) <= 10) {
        isComposite = true;
        secondaryType = axisToTypeMap[secondAxis];
      }
    }

    return {
      primaryType: primaryType,
      secondaryType: secondaryType,
      isComposite: isComposite,
      scores: scores
    };
  };

  /**
   * 診断結果 → 継続のロードマップ（数ステップ）。機能定義書 F-02。
   * 担当: ひろと / Issue #35 [p4g] ロードマップ生成ロジック
   * @param {Diagnosis} diagnosis
   * @returns {RoadmapStep[]}
   */
  App.buildRoadmap = function(diagnosis) {
    var primaryType = diagnosis && App.TYPE_META[diagnosis.primaryType]
      ? diagnosis.primaryType
      : "type6";
    var secondaryType = diagnosis && diagnosis.secondaryType && App.TYPE_META[diagnosis.secondaryType]
      ? diagnosis.secondaryType
      : null;
    var isComposite = Boolean(
      diagnosis && diagnosis.isComposite && secondaryType && secondaryType !== "type6"
    );

    var plans = {
      type1: {
        concept: "汚れ落とし・化粧水・軽めの保湿",
        tonightTitle: "今夜はやさしく洗って水分を補う",
        tonightBody: "ベタつきやテカリが気になる場合も、強くこすらず汚れを落とし、化粧水でうるおいを与える流れが選択肢になります。",
        morningTitle: "明日の朝は軽い保湿で整える",
        morningBody: "朝は洗いすぎを避け、化粧水と軽めの保湿で肌を整える流れを試せます。日中のテカリ具合を見ながら量を調整します。",
        term: "化粧水"
      },
      type2: {
        concept: "汚れ落とし・化粧水・乳液",
        tonightTitle: "今夜はうるおいを重ねる",
        tonightBody: "カサつきやつっぱりが気になる場合は、洗顔後に化粧水でうるおいを与え、乳液やクリームで保つ流れが選択肢になります。",
        morningTitle: "明日の朝も乾きやすい部分を確認する",
        morningBody: "朝は頬や口周りなど乾きやすい部分を確認し、必要に応じて少量の保湿を足す流れを試せます。",
        term: "乳液"
      },
      type3: {
        concept: "汚れ落とし・化粧水・低刺激寄りの保湿",
        tonightTitle: "今夜は摩擦を少なくして整える",
        tonightBody: "ニキビや赤みが気になる場合は、こすらず洗い、肌を整える化粧水と保湿を少量ずつ使う流れが選択肢になります。",
        morningTitle: "明日の朝は触りすぎを避ける",
        morningBody: "朝は気になる部分を何度も触らず、洗顔と保湿を短い手順にまとめると続けやすくなります。",
        term: "低刺激"
      },
      type4: {
        concept: "汚れ落とし・化粧水・アフターシェーブ保湿",
        tonightTitle: "今夜は剃った後の肌をやさしく保つ",
        tonightBody: "ひげ剃り後のケアが必要な傾向がある場合は、洗顔後にうるおいを与え、剃った部分を保湿する流れが選択肢になります。",
        morningTitle: "明日の朝は剃る前後の摩擦を減らす",
        morningBody: "朝にひげを剃る場合は、肌をぬらしてから剃り、剃った後に化粧水や保湿を重ねる流れを試せます。",
        term: "アフターシェーブ"
      },
      type5: {
        concept: "汚れ落とし・化粧水・うるおい重視の保湿",
        tonightTitle: "今夜は年齢に応じたうるおいを意識する",
        tonightBody: "くすみやハリ不足が気になる場合は、洗顔後にうるおいを与え、保湿で肌を整える流れが選択肢になります。",
        morningTitle: "明日の朝は乾燥による印象変化を確認する",
        morningBody: "朝は乾きやすい部分を見て、化粧水と保湿を薄く重ねる流れを試せます。日中の肌の見え方も記録の材料になります。",
        term: "エイジングケア"
      },
      type6: {
        concept: "汚れ落とし・オールインワン",
        tonightTitle: "今夜は少ない手順で始める",
        tonightBody: "スキンケアに慣れていない場合は、洗顔の後にオールインワンなど1本で済む手順から始めると続けやすくなります。",
        morningTitle: "明日の朝も同じ流れを短く行う",
        morningBody: "朝も洗顔と1本のケアに絞ると、習慣として試しやすくなります。一般的な目安として、3週間ほど続けてから見直します。",
        term: "オールインワン"
      }
    };

    var main = plans[primaryType] || plans.type6;
    var steps = [
      {
        order: 1,
        title: "今日そろえる概念を決める",
        body: "まずは商品名ではなく、「" + main.concept + "」のような概念で必要な手順を整理します。具体的な候補は次の画面で確認します。",
        term: main.term
      },
      {
        order: 2,
        title: main.tonightTitle,
        body: main.tonightBody,
        term: main.term
      },
      {
        order: 3,
        title: main.morningTitle,
        body: main.morningBody,
        term: main.term
      }
    ];

    if (isComposite) {
      var subMeta = App.TYPE_META[secondaryType];
      var sub = plans[secondaryType] || plans.type6;
      steps.push({
        order: 4,
        title: "もう一つの傾向も少しだけ意識する",
        body: "第二タイプとして「" + subMeta.name + "」の傾向も見られます。最初から手順を増やしすぎず、メインの流れに慣れてから「" + sub.concept + "」の要素を1つずつ足す形が選択肢になります。",
        term: sub.term
      });
    } else {
      steps.push({
        order: 4,
        title: "3週間を目安に続けて見直す",
        body: "一般的な目安として、肌の変化は日ごとの体調や生活習慣にも左右されます。まずは無理のない手順で続け、記録画面で状態を振り返ります。"
      });
    }

    return steps;
  };

  function recommendationTypes(diagnosis) {
    var mainType = diagnosis && diagnosis.primaryType ? diagnosis.primaryType : null;
    var subType = null;

    if (
      diagnosis &&
      diagnosis.isComposite &&
      diagnosis.secondaryType &&
      diagnosis.secondaryType !== "type6" &&
      diagnosis.secondaryType !== mainType
    ) {
      subType = diagnosis.secondaryType;
    }

    return {
      mainType: mainType,
      subType: subType,
      targets: subType ? [mainType, subType] : (mainType ? [mainType] : [])
    };
  }

  function eligibleProducts(budget) {
    var source = typeof global.filterProductsByBudget === "function"
      ? global.filterProductsByBudget(budget)
      : (global.PRODUCTS || []).slice();

    return source.filter(function (product) {
      return product && Array.isArray(product.typeTags);
    });
  }

  function matchingTypeCount(product, targets) {
    return targets.reduce(function (count, type) {
      return count + (product.typeTags.indexOf(type) !== -1 ? 1 : 0);
    }, 0);
  }

  function compareCandidates(targets) {
    return function (left, right) {
      var matchDifference = matchingTypeCount(right, targets) - matchingTypeCount(left, targets);
      if (matchDifference !== 0) return matchDifference;

      var leftPrice = typeof left.price === "number" ? left.price : Number.POSITIVE_INFINITY;
      var rightPrice = typeof right.price === "number" ? right.price : Number.POSITIVE_INFINITY;
      if (leftPrice !== rightPrice) return leftPrice - rightPrice;

      var leftHasSummary = typeof left.summary_one_liner === "string" && left.summary_one_liner.trim() !== "";
      var rightHasSummary = typeof right.summary_one_liner === "string" && right.summary_one_liner.trim() !== "";
      return Number(rightHasSummary) - Number(leftHasSummary);
    };
  }

  function categoryGroups(products, targets) {
    var groups = [];
    var indexes = {};

    products.forEach(function (product) {
      var category = product.category || "";
      if (!Object.prototype.hasOwnProperty.call(indexes, category)) {
        indexes[category] = groups.length;
        groups.push({ category: category, products: [] });
      }
      groups[indexes[category]].products.push(product);
    });

    groups.forEach(function (group) {
      group.products.sort(compareCandidates(targets));
      group.products = group.products.slice(0, 3);
    });

    return groups;
  }

  /**
   * 診断結果 ＋ 予算帯 → 商品候補（概念ごと／複合時はメイン＋サブ）。
   * data/products.js（window.PRODUCTS, filterProductsByBudget）を使う。
   * 担当: たかと・ひろと / Issue #37 [p4h] 推薦ロジック（純粋関数）
   * @param {Diagnosis} diagnosis
   * @param {("core"|"sub")} budget
   * @returns {Recommendation}
   */
  App.recommend = function (diagnosis, budget) {
    var types = recommendationTypes(diagnosis);
    var products = eligibleProducts(budget);
    var main = types.mainType
      ? categoryGroups(products.filter(function (product) {
        return product.typeTags.indexOf(types.mainType) !== -1;
      }), types.targets)
      : [];
    var sub = types.subType
      ? categoryGroups(products.filter(function (product) {
        return product.typeTags.indexOf(types.subType) !== -1;
      }), types.targets)
      : null;

    return {
      main: main,
      sub: sub,
      isComposite: types.subType !== null
    };
  };

  /**
   * 選んだ商品（最大3）→ 横並び比較表。値が分かれる行は differs=true。
   * 成分は「有無」のみ。効能・安全性の断定は載せない（薬機法）。
   * 担当: ゆうと / Issue #38 [p4d] SC-03 商品比較UI
   * @param {Product[]} products
   * @returns {CompareTable}
   */
  App.buildCompareTable = notImplemented(
    "App.buildCompareTable", "ゆうと", "#38", "docs/design/推薦ロジック仕様書_v1.0.md §4"
  );
})(window);
