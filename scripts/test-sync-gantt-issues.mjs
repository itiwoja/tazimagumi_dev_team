import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as gantt from "./sync-gantt-issues.mjs";

const { buildSyncedSection, replaceSyncedSection } = gantt;

const tasks = [
  { id: "p2a", issue: 24, section: "P2 基盤", start: "2026-06-19", end: "2026-06-30" },
  { id: "p4c", issue: 36, section: "P4 機能", start: "2026-08-01", end: "2026-08-18" }
];

const issues = [
  {
    number: 24,
    title: "[p2a] リポジトリ・PWA雛形",
    state: "CLOSED",
    assignees: [],
    labels: [{ name: "緊急度: 高" }, { name: "type-feature" }],
    milestone: { title: "M-MVP 最小アプリ Web公開" },
    updatedAt: "2026-07-14T01:00:00Z",
    closedAt: "2026-07-14T01:30:00Z",
    url: "https://github.com/example/repo/issues/24"
  },
  {
    number: 36,
    title: "[p4c][ui] SC-02: ロードマップ | UI,\n続き;",
    state: "OPEN",
    assignees: [{ login: "ren-1222" }],
    labels: [{ name: "type-feature" }],
    milestone: null,
    updatedAt: "2026-07-14T02:00:00Z",
    closedAt: null,
    url: "https://github.com/example/repo/issues/36"
  }
];

test("同期ブロックはIssue状態・担当・緊急度・マイルストーン・完了日を表へ反映する", () => {
  const section = buildSyncedSection(tasks, issues, "2026-07-14");

  assert.match(section, /\| ガントID \| Issue \| タスク \| Issue状態 \| 担当 \| 緊急度 \| マイルストーン \| 最終更新 \| 完了日 \|/);
  assert.match(section, /\| p2a \| \[#24\].*\| 完了 \| 未割当 \| 高 \| M-MVP 最小アプリ Web公開 \| 2026-07-14 \| 2026-07-14 \|/);
  assert.match(section, /\| p4c \| \[#36\].*\| 未完了 \| ren-1222 \| なし \| なし \| 2026-07-14 \| — \|/);
  assert.match(section, /Issue状態はGitHub Issue本体の状態であり、developへの統合済み・リリース準備完了を意味しません/);
});

test("同期ブロックはIssue状態をMermaidへ反映する", () => {
  const section = buildSyncedSection(tasks, issues, "2026-07-14");

  assert.match(section, /:done, p2a, 2026-06-19, 2026-06-30/);
  assert.match(section, /:p4c, 2026-08-01, 2026-08-18/);
});

test("タイトルのタグを除去し、Markdown表とMermaidの区切り文字・改行を安全に正規化する", () => {
  const section = buildSyncedSection(tasks, issues, "2026-07-14");

  assert.match(section, /\| p4c \| \[#36\][^\n]*SC-02： ロードマップ &#124; UI, 続き;/);
  assert.match(section, /#36 SC-02： ロードマップ ｜ UI， 続き； :p4c/);
  assert.doesNotMatch(section, /\[p4c\]|\[ui\]/);
});

test("同期ブロックだけを置換し、それ以外の文書を維持する", () => {
  const document = [
    "前書き",
    "<!-- GANTT_ISSUE_SYNC:START -->",
    "古い同期結果",
    "<!-- GANTT_ISSUE_SYNC:END -->",
    "後書き"
  ].join("\n");
  const replacement = "<!-- GANTT_ISSUE_SYNC:START -->\n新しい同期結果\n<!-- GANTT_ISSUE_SYNC:END -->";

  assert.equal(
    replaceSyncedSection(document, replacement),
    ["前書き", replacement, "後書き"].join("\n")
  );
});

test("対応するIssueが欠落している場合は明示的に失敗する", () => {
  assert.throws(
    () => buildSyncedSection(tasks, issues.slice(0, 1), "2026-07-14"),
    /対応するGitHub Issueを取得できませんでした: #36/
  );
});

test("重複ガントIDを拒否する", () => {
  const duplicateId = { ...tasks[1], id: "p2a" };

  assert.throws(
    () => buildSyncedSection([tasks[0], duplicateId], issues, "2026-07-14"),
    /重複ガントID: p2a/
  );
});

test("重複Issue番号を拒否する", () => {
  const duplicateIssue = { ...tasks[1], issue: 24 };

  assert.throws(
    () => buildSyncedSection([tasks[0], duplicateIssue], issues, "2026-07-14"),
    /重複Issue番号: #24/
  );
});

test("開始日が終了日より後の日付範囲を拒否する", () => {
  const reversed = { ...tasks[0], start: "2026-07-01", end: "2026-06-30" };

  assert.throws(
    () => buildSyncedSection([reversed], [issues[0]], "2026-07-14"),
    /不正な日付範囲.*p2a.*2026-07-01.*2026-06-30/
  );
});

test("実在しない暦日を拒否する", () => {
  const invalidDate = { ...tasks[0], start: "2026-02-30" };

  assert.throws(
    () => buildSyncedSection([invalidDate], [issues[0]], "2026-07-14"),
    /不正な日付.*p2a.*2026-02-30/
  );
});

test("同期日はUTC日付ではなくAsia/Tokyoの暦日を使う", () => {
  assert.equal(
    gantt.syncDateInTokyo(new Date("2026-07-14T15:30:00.000Z")),
    "2026-07-15"
  );
});

test("Issueの最終更新・完了日もAsia/Tokyoの暦日で表示する", () => {
  const boundaryIssue = {
    ...issues[1],
    state: "CLOSED",
    updatedAt: "2026-07-14T15:30:00.000Z",
    closedAt: "2026-07-14T15:31:00.000Z"
  };
  const section = buildSyncedSection([tasks[1]], [boundaryIssue], "2026-07-15");

  assert.match(section, /\| 2026-07-15 \| 2026-07-15 \|/);
});

test("生成ブロックの各行に末尾空白を残さない", () => {
  const section = buildSyncedSection(tasks, issues, "2026-07-14");

  for (const line of section.split("\n")) {
    assert.doesNotMatch(line, /[ \t]+$/);
  }
});

test("同期マーカーは独立行だけを認識し、説明文中の文字列は維持する", () => {
  const document = [
    `説明: ${"<!-- GANTT_ISSUE_SYNC:START -->"} / ${"<!-- GANTT_ISSUE_SYNC:END -->"}`,
    "<!-- GANTT_ISSUE_SYNC:START -->",
    "古い同期結果",
    "<!-- GANTT_ISSUE_SYNC:END -->"
  ].join("\n");
  const replacement = "<!-- GANTT_ISSUE_SYNC:START -->\n新しい同期結果\n<!-- GANTT_ISSUE_SYNC:END -->";

  assert.equal(
    replaceSyncedSection(document, replacement),
    [`説明: ${"<!-- GANTT_ISSUE_SYNC:START -->"} / ${"<!-- GANTT_ISSUE_SYNC:END -->"}`, replacement].join("\n")
  );

  const crlfDocument = document.replace(/\n/g, "\r\n");
  assert.equal(
    replaceSyncedSection(crlfDocument, replacement),
    [`説明: ${"<!-- GANTT_ISSUE_SYNC:START -->"} / ${"<!-- GANTT_ISSUE_SYNC:END -->"}`, replacement.replace(/\n/g, "\r\n")]
      .join("\r\n")
  );
});

test("独立行の同期マーカーがない、重複する、または順序が逆なら拒否する", () => {
  const inlineOnly = `説明: ${"<!-- GANTT_ISSUE_SYNC:START -->"} / ${"<!-- GANTT_ISSUE_SYNC:END -->"}`;
  const duplicate = [
    "<!-- GANTT_ISSUE_SYNC:START -->",
    "<!-- GANTT_ISSUE_SYNC:START -->",
    "<!-- GANTT_ISSUE_SYNC:END -->"
  ].join("\n");
  const reversed = [
    "<!-- GANTT_ISSUE_SYNC:END -->",
    "<!-- GANTT_ISSUE_SYNC:START -->"
  ].join("\n");

  assert.throws(() => replaceSyncedSection(inlineOnly, "replacement"), /同期マーカー/);
  assert.throws(() => replaceSyncedSection(duplicate, "replacement"), /同期マーカー/);
  assert.throws(() => replaceSyncedSection(reversed, "replacement"), /同期マーカー/);
});

test("ガント設定の必須フィールドと安全な文書パスを検証する", () => {
  assert.throws(() => gantt.validateConfig(null), /ガント設定/);
  assert.throws(
    () => gantt.validateConfig({ document: "../outside.md", tasks }),
    /文書パス/
  );
  assert.throws(
    () => gantt.validateConfig({ document: "docs/schedule/test.md", tasks: [] }),
    /タスク/
  );
});

test("実運用のガント設定がスキーマを満たす", () => {
  const config = JSON.parse(
    readFileSync(new URL("./gantt-issue-map.json", import.meta.url), "utf8")
  );

  assert.equal(gantt.validateConfig(config), config);
});

test("タスクのID・Issue番号・sectionを厳格に検証する", () => {
  assert.throws(
    () => buildSyncedSection([{ ...tasks[0], id: "bad id" }], [issues[0]], "2026-07-14"),
    /ガントID/
  );
  assert.throws(
    () => buildSyncedSection([{ ...tasks[0], issue: 0 }], [issues[0]], "2026-07-14"),
    /Issue番号/
  );
  assert.throws(
    () => buildSyncedSection([{ ...tasks[0], section: "  " }], [issues[0]], "2026-07-14"),
    /section/
  );
});

test("Issue由来のMarkdown・HTML・Mermaid制御文字をプレーンテキスト化する", () => {
  const unsafeIssue = {
    ...issues[1],
    title: "[p4c] <details>[誘導](//attacker.example) ![画像](x) @team `code` %%{init}%% | www.attacker.example",
    labels: [{ name: "緊急度: https://attacker.example/high" }],
    milestone: { title: "<img src=x onerror=alert(1)> https://attacker.example/milestone" }
  };
  const section = buildSyncedSection([tasks[1]], [unsafeIssue], "2026-07-14");

  assert.doesNotMatch(section, /<details>|<img|\]\(\/\/attacker|!\[|@team|`code`|%%\{init\}%%|www\.attacker|https:\/\/attacker/);
  assert.match(section, /&lt;details&gt;/);
  assert.match(section, /www&#46;attacker&#46;example/);
  assert.match(section, /https&#58;&#47;&#47;attacker&#46;example&#47;high/);
  assert.match(section, /＠team/);
  assert.match(section, /％％｛init｝％％/);
});

test("RESTの全ページからPRを除外しIssue項目を同期形式へ正規化する", () => {
  const pages = [[
    {
      number: 24,
      title: "Issue",
      state: "closed",
      assignees: [{ login: "owner" }],
      labels: [{ name: "type-docs" }],
      milestone: { title: "M-MVP" },
      updated_at: "2026-07-14T00:00:00Z",
      closed_at: "2026-07-14T01:00:00Z",
      html_url: "https://github.com/example/repo/issues/24"
    },
    { number: 25, title: "PR", pull_request: {}, html_url: "https://github.com/example/repo/pull/25" }
  ]];

  assert.deepEqual(gantt.normalizeRestIssuePages(pages), [{
    number: 24,
    title: "Issue",
    state: "CLOSED",
    assignees: [{ login: "owner" }],
    labels: [{ name: "type-docs" }],
    milestone: { title: "M-MVP" },
    updatedAt: "2026-07-14T00:00:00Z",
    closedAt: "2026-07-14T01:00:00Z",
    url: "https://github.com/example/repo/issues/24"
  }]);
});
