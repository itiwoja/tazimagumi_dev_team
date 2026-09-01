import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync("app/data/question-templates.js", "utf8");
const window = {};
vm.runInNewContext(source, { window }, { filename: "app/data/question-templates.js" });

const templates = window.QUESTION_TEMPLATES;
const typeIds = ["type1", "type2", "type3", "type4", "type5", "type6"];
const forbiddenExpression = /(?:効く|治る|治ります|消える|改善する|治療|予防)/;
const errors = [];

if (!Array.isArray(templates)) {
  errors.push("QUESTION_TEMPLATES must be an array.");
} else {
  const ids = new Set();
  const typeCounts = Object.fromEntries(typeIds.map((typeId) => [typeId, 0]));
  let commonCount = 0;

  templates.forEach((template, index) => {
    if (!template || typeof template.id !== "string" || template.id.trim() === "") {
      errors.push(`Template ${index} must have a non-empty id.`);
    } else if (ids.has(template.id)) {
      errors.push(`Template id must be unique: ${template.id}`);
    } else {
      ids.add(template.id);
    }

    if (!template || typeof template.text !== "string" || template.text.trim() === "") {
      errors.push(`Template ${index} must have selectable text.`);
    } else if (forbiddenExpression.test(template.text)) {
      errors.push(`Template contains a prohibited expression: ${template.id}`);
    }

    if (template && template.types === null) {
      commonCount += 1;
    } else if (template && Array.isArray(template.types) && template.types.length > 0) {
      template.types.forEach((typeId) => {
        if (!Object.prototype.hasOwnProperty.call(typeCounts, typeId)) {
          errors.push(`Unknown type id in ${template.id}: ${typeId}`);
        } else {
          typeCounts[typeId] += 1;
        }
      });
    } else {
      errors.push(`Template ${template && template.id ? template.id : index} must have types=null or one or more type ids.`);
    }
  });

  if (commonCount < 2) errors.push("At least two common templates are required.");
  typeIds.forEach((typeId) => {
    if (typeCounts[typeId] < 2) errors.push(`${typeId} must have at least two templates.`);
  });
}

if (errors.length > 0) {
  errors.forEach((error) => console.error(error));
  process.exitCode = 1;
} else {
  console.log("Question templates are valid.");
}
