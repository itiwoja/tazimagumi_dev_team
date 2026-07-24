import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");

test("result screen loads the celebration stylesheet and exposes a result card", async () => {
  const html = await read("app/index.html");
  assert.match(html, /href="\.\/css\/result-celebration\.css"/);
  assert.match(html, /class="result-card\b/);
  assert.doesNotMatch(html, /s2ResultImage|result-card__image/);
  assert.doesNotMatch(html, /s2ResultIcon|result-card__icon/);
  assert.match(html, /result-card__cracker--left/);
  assert.match(html, /result-card__cracker--right/);
  assert.match(html, /class="done-sub"[^>]*aria-live="polite"[^>]*>\s*<b id="s2ResultType"/);

  const serviceWorker = await read("app/sw.js");
  assert.match(serviceWorker, /\.\/css\/result-celebration\.css/);
});

test("result reveal is triggered only for the completion transition", async () => {
  const screens = await read("app/js/screens.js");
  assert.match(screens, /App\.playResultReveal\(\)/);
  assert.match(screens, /App\.playResultReveal = function/);
  assert.match(screens, /result-card--revealing/);
  assert.doesNotMatch(screens, /assets\/diagnosis|s2ResultImage/);
});

test("result celebration has a reduced-motion fallback", async () => {
  const css = await read("app/css/result-celebration.css");
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /animation:\s*none/);
  assert.doesNotMatch(css, /result-card__icon/);
  assert.match(css, /cracker-left/);
  assert.match(css, /cracker-right/);
});
