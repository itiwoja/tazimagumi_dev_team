#!/usr/bin/env node
/* =====================================================================
   ブランチ名・コミット規約チェッカー（Issue #83 [提案-Z4]）
   ---------------------------------------------------------------------
   CLAUDE.md（AGENTS.md）の branch_rules.naming / branch_rules.commit を
   機械検証する。依存パッケージなし（node:child_process のみ）。
   - CI（.github/workflows/branch-commit-check.yml）から呼ぶ。
   - 単体テストは scripts/test-check-branch-and-commit-rules.mjs。

   方針の根拠: CLAUDE.md（AGENTS.md） branch_rules ブロック。
   ===================================================================== */
"use strict";

import { execFileSync } from "node:child_process";

/** CLAUDE.md branch_rules.naming.allowed_types */
export const ALLOWED_BRANCH_TYPES = ["feature", "fix", "docs", "chore", "refactor"];

/** CLAUDE.md branch_rules.commit.format allowed_types */
export const ALLOWED_COMMIT_TYPES = ["feat", "fix", "docs", "refactor", "test", "chore"];

/** CLAUDE.md branch_rules.protected_branches */
export const PROTECTED_BRANCHES = ["main", "develop"];

/**
 * ブランチ名が `<type>/<kebab-scope>` 規約に合致するか検証する。
 * type は allowed_types のいずれか、scope は小文字英数字とハイフンのみ
 * （日本語・空白・大文字・アンダースコア禁止 = charset "a-z 0-9 -" を強制）。
 */
export function isValidBranchName(name) {
  if (typeof name !== "string" || name === "") {
    return { valid: false, reason: "ブランチ名が空です。" };
  }
  if (PROTECTED_BRANCHES.indexOf(name) !== -1) {
    return { valid: false, reason: `"${name}" は保護ブランチです。作業ブランチには使えません。` };
  }
  const pattern = new RegExp(`^(${ALLOWED_BRANCH_TYPES.join("|")})\\/[a-z0-9]+(-[a-z0-9]+)*$`);
  if (!pattern.test(name)) {
    return {
      valid: false,
      reason:
        `"${name}" は規約違反です。ブランチ名は "<type>/<kebab-scope>" 形式にしてください` +
        `（type: ${ALLOWED_BRANCH_TYPES.join("|")} / scope: 半角英小文字・数字・ハイフンのみ）。`
    };
  }
  return { valid: true, reason: null };
}

/** コミットメッセージのマージコミット（自動生成）かどうかを判定する。 */
export function isMergeCommitSubject(subject) {
  return /^Merge (branch|pull request|remote-tracking branch) /.test(subject);
}

/**
 * コミットメッセージ（1行目）が `<type>: <summary>` 規約に合致するか検証する。
 * マージコミットは対象外（isMergeCommitSubject で判定）。
 */
export function isValidCommitSubject(subject) {
  if (typeof subject !== "string" || subject === "") {
    return { valid: false, reason: "コミットメッセージが空です。" };
  }
  if (isMergeCommitSubject(subject)) {
    return { valid: true, reason: null };
  }
  const pattern = new RegExp(`^(${ALLOWED_COMMIT_TYPES.join("|")}): .+$`);
  if (!pattern.test(subject)) {
    return {
      valid: false,
      reason:
        `"${subject}" は規約違反です。コミットメッセージは "<type>: <要約>" 形式にしてください` +
        `（type: ${ALLOWED_COMMIT_TYPES.join("|")}）。`
    };
  }
  return { valid: true, reason: null };
}

function checkBranch(name) {
  const result = isValidBranchName(name);
  if (!result.valid) {
    console.error(`[ERROR] ${result.reason}`);
    console.error("参考: CLAUDE.md（AGENTS.md） branch_rules.naming");
    process.exit(1);
  }
  console.log(`OK: ブランチ名 "${name}" は規約に合致しています。`);
  process.exit(0);
}

function checkCommits(baseSha, headSha) {
  let log;
  try {
    log = execFileSync("git", ["log", "--format=%H%x1f%s", `${baseSha}..${headSha}`], {
      encoding: "utf8"
    });
  } catch (e) {
    console.error(`[ERROR] git log の取得に失敗しました: ${e.message}`);
    process.exit(1);
  }

  const lines = log.split("\n").filter((l) => l.trim() !== "");
  const errors = [];
  for (const line of lines) {
    const [sha, subject] = line.split("\x1f");
    const result = isValidCommitSubject(subject);
    if (!result.valid) {
      errors.push(`[ERROR] ${sha.slice(0, 7)}: ${result.reason}`);
    }
  }

  if (errors.length > 0) {
    console.error(errors.join("\n"));
    console.error("\n参考: CLAUDE.md（AGENTS.md） branch_rules.commit");
    process.exit(1);
  }
  console.log(`OK: ${lines.length} 件のコミットメッセージは規約に合致しています。`);
  process.exit(0);
}

function main() {
  const [, , mode, ...rest] = process.argv;
  if (mode === "branch") {
    checkBranch(rest[0]);
  } else if (mode === "commits") {
    checkCommits(rest[0], rest[1]);
  } else {
    console.error('使い方: node check-branch-and-commit-rules.mjs branch "<branch-name>"');
    console.error('        node check-branch-and-commit-rules.mjs commits <base-sha> <head-sha>');
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
