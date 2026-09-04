import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function loadDiagnose() {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync("app/js/contracts.js", "utf8"), sandbox, {
    filename: "app/js/contracts.js"
  });
  return sandbox.window.App.diagnose;
}

test("肌カテゴリは皮脂の悩みを皮脂軸へ加点する", () => {
  const diagnose = loadDiagnose();
  const result = diagnose([
    "皮脂・テカリ",
    "すぐベタつく",
    "夏にテカる",
    "〜5,000円",
    "朝も夜もいける"
  ], { focusCategory: "skin" });

  assert.equal(result.scores.oily, 60);
  assert.equal(result.primaryType, "type1");
});

test("髭剃りカテゴリは髭剃り後の赤みを髭剃り・炎症へ加点する", () => {
  const diagnose = loadDiagnose();
  const result = diagnose([
    "赤み・ブツブツ",
    "毎日",
    "T字カミソリ",
    "〜5,000円",
    "朝も夜もいける"
  ], { focusCategory: "shave" });

  assert.equal(result.scores.shave, 70);
  assert.equal(result.scores.inflam, 15);
  assert.equal(result.primaryType, "type4");
});

test("髪カテゴリはフケを炎症軸へ、薄さを加齢軸へ反映する", () => {
  const diagnose = loadDiagnose();
  const flaky = diagnose([
    "フケ・かゆみ",
    "赤み・かゆみがある",
    "まだわからない",
    "〜5,000円",
    "朝も夜もいける"
  ], { focusCategory: "hair" });
  const thinning = diagnose([
    "薄さが気になる",
    "特に気にならない",
    "細い・ボリュームが出にくい",
    "〜5,000円",
    "朝も夜もいける"
  ], { focusCategory: "hair" });

  assert.equal(flaky.scores.inflam, 50);
  assert.equal(flaky.primaryType, "type3");
  assert.equal(thinning.scores.aging, 40);
  assert.equal(thinning.primaryType, "type5");
});

test("カテゴリを渡さない旧形式の5問診断も維持する", () => {
  const diagnose = loadDiagnose();
  const result = diagnose([
    "テカリ・ベタつき",
    "とくに問題ない",
    "ペタッとする",
    "〜1,500円",
    "朝も夜もいける"
  ]);

  assert.equal(result.scores.oily, 40);
  assert.equal(result.primaryType, "type1");
});
