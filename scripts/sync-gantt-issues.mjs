#!/usr/bin/env node
/*
 * GitHub Issuesを正として、ガントチャート内の同期ブロックを再生成する。
 *
 * 使い方:
 *   node scripts/sync-gantt-issues.mjs
 *   node scripts/sync-gantt-issues.mjs --check
 *   node scripts/sync-gantt-issues.mjs --issues-file path/to/issues.json
 *
 * 日程・ガントID・Issue番号の対応は scripts/gantt-issue-map.json で管理する。
 * Issueのタイトル、状態、担当者、緊急度ラベル、マイルストーン、更新/完了日時はGitHubから取得する。
 */
"use strict";

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const START = "<!-- GANTT_ISSUE_SYNC:START -->";
const END = "<!-- GANTT_ISSUE_SYNC:END -->";
const ISSUE_JQ = [
  ".[]",
  "select(.pull_request == null)",
  "{number,title,state,assignees: [.assignees[] | {login}],labels: [.labels[] | {name}],milestone: (if .milestone then {title: .milestone.title} else null end),updated_at,closed_at,html_url}",
  "@json"
].join(" | ");
const TABLE_ENTITIES = Object.freeze({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\\": "&#92;",
  "|": "&#124;",
  "`": "&#96;",
  "[": "&#91;",
  "]": "&#93;",
  "(": "&#40;",
  ")": "&#41;",
  "!": "&#33;",
  "*": "&#42;",
  "_": "&#95;",
  "~": "&#126;",
  "@": "&#64;",
  "%": "&#37;",
  "{": "&#123;",
  "}": "&#125;",
  ".": "&#46;",
  ":": "&#58;",
  "/": "&#47;"
});
const MERMAID_REPLACEMENTS = Object.freeze({
  ":": "：",
  ",": "，",
  ";": "；",
  "|": "｜",
  "<": "＜",
  ">": "＞",
  "{": "｛",
  "}": "｝",
  "[": "［",
  "]": "］",
  "(": "（",
  ")": "）",
  "`": "｀",
  "@": "＠",
  "%": "％",
  "!": "！",
  "\\": "＼",
  "&": "＆",
  ".": "．",
  "/": "／"
});

function normalizeInline(text) {
  return String(text ?? "").replace(/\r\n?|\n/g, " ").replace(/\s+/g, " ").trim();
}

function taskName(title) {
  return normalizeInline(title)
    .replace(/^(?:\[[^\]]+\]\s*)+/, "")
    .replace(/:/g, "：")
    .trim();
}

function assigneeNames(issue) {
  const names = (issue.assignees || []).map((assignee) => assignee.login).filter(Boolean);
  return names.length > 0 ? names.join(", ") : "未割当";
}

function stateLabel(issue) {
  return String(issue.state).toUpperCase() === "CLOSED" ? "完了" : "未完了";
}

function mermaidStatus(issue) {
  return String(issue.state).toUpperCase() === "CLOSED" ? "done, " : "";
}

function urgencyLabel(issue) {
  const label = (issue.labels || [])
    .map((item) => (typeof item === "string" ? item : item.name))
    .find((name) => /^緊急度\s*[:：]/.test(name || ""));
  return label ? label.replace(/^緊急度\s*[:：]\s*/, "") : "なし";
}

function milestoneTitle(issue) {
  return issue.milestone?.title || "なし";
}

function dateInTokyo(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${values.year}-${values.month}-${values.day}`;
}

function displayDate(value) {
  return typeof value === "string" ? dateInTokyo(value) || "—" : "—";
}

function escapeTable(text) {
  return Array.from(normalizeInline(text), (character) => TABLE_ENTITIES[character] || character).join("");
}

function mermaidText(text) {
  return Array.from(normalizeInline(text), (character) => MERMAID_REPLACEMENTS[character] || character).join("");
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error("ガント設定のタスクは1件以上の配列で指定してください");
  }
  const ids = new Set();
  const issueNumbers = new Set();

  for (const task of tasks) {
    if (!task || typeof task !== "object" || Array.isArray(task)) {
      throw new Error("ガントタスクはオブジェクトで指定してください");
    }
    if (typeof task.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(task.id)) {
      throw new Error(`不正なガントID: ${task.id}`);
    }
    if (!Number.isInteger(task.issue) || task.issue <= 0) {
      throw new Error(`不正なIssue番号: ${task.issue}`);
    }
    if (typeof task.section !== "string" || task.section.trim() === "") {
      throw new Error(`不正なsection（${task.id}）: ${task.section}`);
    }
    if (ids.has(task.id)) throw new Error(`重複ガントID: ${task.id}`);
    ids.add(task.id);

    if (issueNumbers.has(task.issue)) throw new Error(`重複Issue番号: #${task.issue}`);
    issueNumbers.add(task.issue);

    for (const field of ["start", "end"]) {
      if (!isIsoDate(task[field])) {
        throw new Error(`不正な日付（${task.id}）: ${task[field]}`);
      }
    }
    if (task.start > task.end) {
      throw new Error(`不正な日付範囲（${task.id}）: ${task.start} > ${task.end}`);
    }
  }
}

export function validateConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("ガント設定はオブジェクトで指定してください");
  }
  if (typeof config.document !== "string" || config.document.trim() === "") {
    throw new Error("ガント設定の文書パスが未指定です");
  }
  const documentPath = config.document.replace(/\\/g, "/");
  const pathSegments = documentPath.split("/");
  if (
    config.document !== config.document.trim() ||
    /^[a-zA-Z]:\//.test(documentPath) ||
    documentPath.startsWith("/") ||
    pathSegments.includes("..") ||
    /[\0\r\n]/.test(config.document)
  ) {
    throw new Error(`リポジトリ外を指す文書パスは使用できません: ${config.document}`);
  }
  validateTasks(config.tasks);
  return config;
}

export function syncDateInTokyo(now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("同期日時が不正です");
  }
  return dateInTokyo(now);
}

export function buildSyncedSection(tasks, issues, syncedOn) {
  validateTasks(tasks);
  if (!Array.isArray(issues)) throw new Error("GitHub Issuesは配列で指定してください");
  if (!isIsoDate(syncedOn)) throw new Error(`不正な同期日: ${syncedOn}`);
  const issueByNumber = new Map(issues.map((issue) => [issue.number, issue]));
  const missing = tasks.filter((task) => !issueByNumber.has(task.issue)).map((task) => `#${task.issue}`);
  if (missing.length > 0) {
    throw new Error(`対応するGitHub Issueを取得できませんでした: ${missing.join(", ")}`);
  }

  const rows = tasks.map((task) => {
    const issue = issueByNumber.get(task.issue);
    return `| ${task.id} | [#${issue.number}](${issue.url}) | ${escapeTable(taskName(issue.title))} | ${stateLabel(issue)} | ${escapeTable(assigneeNames(issue))} | ${escapeTable(urgencyLabel(issue))} | ${escapeTable(milestoneTitle(issue))} | ${displayDate(issue.updatedAt)} | ${displayDate(issue.closedAt)} |`;
  });

  const sections = new Map();
  for (const task of tasks) {
    const group = sections.get(task.section) || [];
    group.push(task);
    sections.set(task.section, group);
  }
  const mermaid = [
    "```mermaid",
    "gantt",
    "    title GitHub Issue同期ガント（Issue状態を自動反映）",
    "    dateFormat  YYYY-MM-DD",
    "    axisFormat  %m/%d"
  ];
  for (const [section, sectionTasks] of sections) {
    mermaid.push(`    section ${mermaidText(section)}`);
    for (const task of sectionTasks) {
      const issue = issueByNumber.get(task.issue);
      mermaid.push(`    #${issue.number} ${mermaidText(taskName(issue.title))} :${mermaidStatus(issue)}${task.id}, ${task.start}, ${task.end}`);
    }
  }
  mermaid.push("```");

  return [
    START,
    "## GitHub Issue同期ステータス",
    "",
    `**最終同期日：** ${syncedOn}`,
    "**同期元：** GitHub Issues（タイトル・Issue状態・担当者・緊急度ラベル・マイルストーン・最終更新・完了日時）",
    "**日程の管理元：** `scripts/gantt-issue-map.json`",
    "",
    "> **Issue状態はGitHub Issue本体の状態であり、developへの統合済み・リリース準備完了を意味しません。** Issueのクローズ/再オープン、コメント、担当・タイトル・緊急度ラベル・マイルストーンの変更時に、同期ワークフローがこのブロックだけを更新するPRを作成します。日程を変える場合はIssueではなくマッピングJSONを変更してください。",
    "",
    "| ガントID | Issue | タスク | Issue状態 | 担当 | 緊急度 | マイルストーン | 最終更新 | 完了日 |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    ...mermaid,
    END
  ].join("\n");
}

export function replaceSyncedSection(document, section) {
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const markerMatches = (marker) => [
    ...document.matchAll(new RegExp(`^${escapeRegExp(marker)}\\r?$`, "gm"))
  ];
  const starts = markerMatches(START);
  const ends = markerMatches(END);
  if (starts.length !== 1 || ends.length !== 1 || starts[0].index >= ends[0].index) {
    throw new Error(`同期マーカーは独立行でSTART/ENDを各1件、正しい順序で指定してください: ${START} / ${END}`);
  }
  const newline = document.includes("\r\n") ? "\r\n" : "\n";
  const normalizedSection = section.replace(/\r\n?|\n/g, newline);
  const endOffset = ends[0].index + END.length;
  return `${document.slice(0, starts[0].index)}${normalizedSection}${document.slice(endOffset)}`;
}

function parseArgs(argv) {
  const options = { check: false, issuesFile: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") options.check = true;
    else if (arg === "--issues-file") options.issuesFile = argv[++index];
    else throw new Error(`不明な引数です: ${arg}`);
  }
  return options;
}

export function normalizeRestIssuePages(pages) {
  if (!Array.isArray(pages) || pages.some((page) => !Array.isArray(page))) {
    throw new Error("GitHub Issues APIの応答形式が不正です");
  }
  return pages
    .flat()
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      state: String(issue.state).toUpperCase(),
      assignees: issue.assignees || [],
      labels: issue.labels || [],
      milestone: issue.milestone || null,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at,
      url: issue.html_url
    }));
}

function loadIssues(issuesFile) {
  if (issuesFile) return JSON.parse(readFileSync(resolve(process.cwd(), issuesFile), "utf8"));
  const output = execFileSync(
    "gh",
    [
      "api",
      "--paginate",
      "-H",
      "Accept: application/vnd.github+json",
      "-H",
      "X-GitHub-Api-Version: 2022-11-28",
      "repos/{owner}/{repo}/issues?state=all&per_page=100",
      "--jq",
      ISSUE_JQ
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 10 * 1024 * 1024 }
  );
  const records = output
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
  return normalizeRestIssuePages([records]);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const configPath = resolve(HERE, "gantt-issue-map.json");
  const config = validateConfig(JSON.parse(readFileSync(configPath, "utf8")));
  const documentPath = resolve(HERE, "..", config.document);
  const issues = loadIssues(options.issuesFile);
  const syncDate = syncDateInTokyo();
  const section = buildSyncedSection(config.tasks, issues, syncDate);
  const before = readFileSync(documentPath, "utf8");
  const after = replaceSyncedSection(before, section);

  if (after === before) {
    console.log("ガントチャートはGitHub Issuesと同期済みです。");
    return;
  }
  if (options.check) {
    console.error("ガントチャートのIssue同期結果に差分があります。node scripts/sync-gantt-issues.mjs を実行してください。");
    process.exitCode = 1;
    return;
  }
  writeFileSync(documentPath, after, "utf8");
  console.log(`同期しました: ${config.document} (${config.tasks.length}件)`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
