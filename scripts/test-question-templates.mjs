import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const typeIds = ["type1", "type2", "type3", "type4", "type5", "type6"];

function loadQuestionTemplates() {
  const window = { App: {} };
  const context = { window };
  vm.runInNewContext(readFileSync("app/data/question-templates.js", "utf8"), context, {
    filename: "app/data/question-templates.js"
  });
  vm.runInNewContext(readFileSync("app/js/contracts.js", "utf8"), context, {
    filename: "app/js/contracts.js"
  });
  return window;
}

test("質問テンプレは全タイプに静的な例文を2件ずつ持つ", () => {
  const { QUESTION_TEMPLATES } = loadQuestionTemplates();

  assert.equal(QUESTION_TEMPLATES.filter((template) => template.types === null).length, 2);
  typeIds.forEach((typeId) => {
    assert.equal(
      QUESTION_TEMPLATES.filter((template) => Array.isArray(template.types) && template.types.includes(typeId)).length,
      2
    );
  });
});

test("質問選別は第一タイプを先頭にして最大4件を決定的に返す", () => {
  const { App } = loadQuestionTemplates();
  const diagnosis = { primaryType: "type2", secondaryType: "type1", isComposite: true };

  const first = App.pickQuestionTemplates(diagnosis);
  const second = App.pickQuestionTemplates(diagnosis);

  assert.deepEqual(Array.from(first, (template) => template.id), ["type2-1", "type2-2", "common-1", "common-2"]);
  assert.deepEqual(Array.from(second, (template) => template.id), Array.from(first, (template) => template.id));
  assert.ok(first.length <= 4);
  assert.deepEqual(
    Array.from(App.pickQuestionTemplates("type2", { limit: 2 }), (template) => template.id),
    ["type2-1", "type2-2"]
  );
});

test("質問選別は上限を尊重し、入力を変更しない", () => {
  const { App, QUESTION_TEMPLATES } = loadQuestionTemplates();
  const templatesBefore = JSON.stringify(QUESTION_TEMPLATES);
  const diagnosis = { primaryType: "type4", secondaryType: "type2", isComposite: true };
  const diagnosisBefore = JSON.stringify(diagnosis);

  const selected = App.pickQuestionTemplates(diagnosis, { limit: 3 });

  assert.deepEqual(Array.from(selected, (template) => template.id), ["type4-1", "type4-2", "common-1"]);
  assert.equal(JSON.stringify(QUESTION_TEMPLATES), templatesBefore);
  assert.equal(JSON.stringify(diagnosis), diagnosisBefore);
});

test("HTMLとS3には例文シートと選択可能なフォールバック導線がある", () => {
  const html = readFileSync("app/index.html", "utf8");
  const s3 = readFileSync("app/js/s3.js", "utf8");

  assert.ok(html.indexOf("question-templates.js") < html.indexOf("contracts.js"));
  assert.match(html, /id="questionSheet"/);
  assert.match(html, /id="questionList"/);
  assert.match(s3, /pickQuestionTemplates/);
  assert.match(s3, /navigator\.clipboard/);
  assert.match(s3, /question-list__text/);
  assert.match(s3, /copyButton\.disabled = true/);
  assert.match(s3, /copyButton\.hidden = true/);
  assert.match(html, /question-sheet__panel/);
  assert.match(s3, /event\.key === "Tab"/);
});
