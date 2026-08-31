import test from "node:test";
import assert from "node:assert/strict";

import {
  isValidBranchName,
  isValidCommitSubject,
  isMergeCommitSubject,
  ALLOWED_BRANCH_TYPES,
  ALLOWED_COMMIT_TYPES
} from "./check-branch-and-commit-rules.mjs";

test("正しいブランチ名は全typeで許容される", () => {
  for (const type of ALLOWED_BRANCH_TYPES) {
    assert.equal(isValidBranchName(`${type}/sc01-check-ui`).valid, true, type);
  }
});

test("数字のみ・単語1つのscopeも許容される", () => {
  assert.equal(isValidBranchName("feature/sc01").valid, true);
  assert.equal(isValidBranchName("fix/163").valid, true);
});

test("許可されていないtypeは拒否される", () => {
  const r = isValidBranchName("feat/sc01-check-ui");
  assert.equal(r.valid, false);
  assert.match(r.reason, /規約違反/);
});

test("スラッシュがないブランチ名は拒否される", () => {
  assert.equal(isValidBranchName("feature-sc01-check-ui").valid, false);
});

test("大文字を含むブランチ名は拒否される", () => {
  assert.equal(isValidBranchName("feature/SC01-check-ui").valid, false);
});

test("アンダースコアを含むブランチ名は拒否される", () => {
  assert.equal(isValidBranchName("feature/sc01_check_ui").valid, false);
});

test("空白を含むブランチ名は拒否される", () => {
  assert.equal(isValidBranchName("feature/sc01 check ui").valid, false);
});

test("日本語を含むブランチ名は拒否される", () => {
  assert.equal(isValidBranchName("feature/身だしなみ").valid, false);
});

test("先頭・末尾・連続ハイフンは拒否される", () => {
  assert.equal(isValidBranchName("feature/-sc01").valid, false);
  assert.equal(isValidBranchName("feature/sc01-").valid, false);
  assert.equal(isValidBranchName("feature/sc01--ui").valid, false);
});

test("保護ブランチ名は拒否される", () => {
  assert.equal(isValidBranchName("main").valid, false);
  assert.equal(isValidBranchName("develop").valid, false);
});

test("空文字・非文字列は拒否される", () => {
  assert.equal(isValidBranchName("").valid, false);
  assert.equal(isValidBranchName(undefined).valid, false);
});

test("正しいコミットメッセージは全typeで許容される", () => {
  for (const type of ALLOWED_COMMIT_TYPES) {
    assert.equal(isValidCommitSubject(`${type}: 要約テキスト`).valid, true, type);
  }
});

test("PR番号付きコミットメッセージも許容される", () => {
  assert.equal(isValidCommitSubject("docs: GitHub Issue進捗をガントへ同期 (#164)").valid, true);
});

test("許可されていないtypeのコミットメッセージは拒否される", () => {
  const r = isValidCommitSubject("feature: 要約テキスト");
  assert.equal(r.valid, false);
  assert.match(r.reason, /規約違反/);
});

test("コロンの後にスペースがないコミットメッセージは拒否される", () => {
  assert.equal(isValidCommitSubject("feat:要約テキスト").valid, false);
});

test("typeのみで要約がないコミットメッセージは拒否される", () => {
  assert.equal(isValidCommitSubject("feat: ").valid, false);
});

test("コロンがないコミットメッセージは拒否される", () => {
  assert.equal(isValidCommitSubject("要約テキストのみ").valid, false);
});

test("マージコミットは規約チェック対象外", () => {
  assert.equal(isMergeCommitSubject("Merge branch 'develop' into feature/x"), true);
  assert.equal(isMergeCommitSubject("Merge pull request #83 from itiwoja/feature/x"), true);
  assert.equal(isValidCommitSubject("Merge branch 'develop' into feature/x").valid, true);
});

test("空文字・非文字列のコミットメッセージは拒否される", () => {
  assert.equal(isValidCommitSubject("").valid, false);
  assert.equal(isValidCommitSubject(undefined).valid, false);
});
