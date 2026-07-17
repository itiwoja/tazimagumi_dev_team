# ikki-claude 運用ガイド v1.0

Issue を `ikki-claude` にアサインすると、GitHub Actions が Claude Code を起動して
**自律実装 → `develop` 向け PR 作成**までを行う仕組みの運用手順。

- ワークフロー本体: [`.github/workflows/agent-issue.yml`](../../.github/workflows/agent-issue.yml)
- 起票テンプレート: [`.github/ISSUE_TEMPLATE/agent_task.md`](../../.github/ISSUE_TEMPLATE/agent_task.md)

---

## 1. 全体フロー

```
[起票] ラフに Issue を書く（ゴール・受け入れ基準・範囲）
   ↓
[計画] Opus セッションで既存コードを読み、Issue に「実装計画」を追記して詰める
   ↓
[発火] ikki-claude をアサイン ＋ agent-ready ラベル
   ↓  （GitHub Webhook: issues assigned/labeled で発火）
[実装] Actions 上の Claude Code が自律実装 → PR 作成（自己マージはしない）
   ↓
[レビュー] agent-review ラベル＋PRコメント。人間が確認してマージ
```

### ラベルの状態遷移

| ラベル | 意味 | 誰が付ける |
| --- | --- | --- |
| `agent-ready` | 計画が固まり、自律着手してよい | 人間（計画確定後） |
| `agent-in-progress` | 実行中（二重発火ロック） | ワークフロー |
| `agent-review` | 実装しPR作成済み。レビュー待ち | ワークフロー |
| `agent-blocked` | 着手したが仕様不明瞭等で停止 | ワークフロー |

再着手させたいときは `agent-blocked` を外して `agent-ready` を付け直す。

---

## 2. なぜ「実装計画を詰める」のか

目的は **エージェントが迷わず・最小トークンで動く**こと。計画が曖昧だと、
エージェントは毎回コードベース全体を調べ直し（トークン浪費）、
方針が一意に決まらず推測実装（品質低下）に走る。

そのため、起票後に **Opus で既存コードを読み、`agent_task.md` の「実装計画」節を具体化する**。
最低限これらを埋めきってから `agent-ready` を付ける:

- **エージェント自律可否**: ⚠️や⛔が残るなら `agent-ready` を付けない
- **確認済みの現状**: 触るファイルが「実装済みか未実装か」を明示（再調査を防ぐ）
- **変更対象ファイル**: new / edit と、共有ファイルを含むか
- **実装手順**: 関数名・データ構造まで踏み込んだ順序つき手順
- **スコープ外**: やらないことを明記（スコープ膨張を止める）

> 計画を詰める Opus セッションへの依頼例:
> 「Issue #NN の実装計画を、既存の `app/` を読んで agent_task テンプレの各節に沿って具体化して。
> 自律可否も判定して。曖昧な点は列挙して（勝手に埋めない）。」

---

## 3. 必要な GitHub Secrets（人間が設定）

リポジトリの Settings → Secrets and variables → Actions に登録する。値はコードに書かない。

| Secret | 生成方法 |
| --- | --- |
| `CLAUDE_CODE_OAUTH_TOKEN` | ローカルで `claude setup-token`（Pro/Max サブスク認証）。**有効期限あり・失効したら再生成** |
| `IKKI_CLAUDE_TOKEN` | ikki-claude アカウントの PAT（repo scope） |
| `IKKI_CLAUDE_EMAIL` | ikki-claude で verified な email |
| `IKKI_CLAUDE_USER_ID` | `gh api users/ikki-claude --jq .id` の数値ID |

---

## 4. トラブルシューティング

### 症状: Actions が数十秒で failure。ログに `SDK execution error` → `Claude Code process exited with code 1`

「SDK options」を出力した直後（API 呼び出し前、数百ms）に落ちている場合、
**`CLAUDE_CODE_OAUTH_TOKEN` の失効・不正**がほぼ確実。認証の初期化で失敗している。

対処:
1. ローカルで再生成: `! claude setup-token`（ブラウザ認証 → トークン文字列が出る）
2. その値で `CLAUDE_CODE_OAUTH_TOKEN` Secret を更新（前後の空白・改行を混ぜない）
3. 対象 Issue の `agent-in-progress` を外し `agent-ready` を付け直して再発火

補足: `claude -p --json-schema '{...}' "test"` がローカルで通るなら、フラグや
スキーマは正常。CI だけ落ちるならトークン要因を最優先で疑う。

### 症状: `agent-blocked` になり「PR を作成できなかった」

- 仕様が Issue から一意に決まらなかった → 計画（§2）を追記して再発火
- gh 未認証で PR 作成に失敗 → ワークフローの Claude 実行ステップに
  `env: GH_TOKEN: ${{ secrets.IKKI_CLAUDE_TOKEN }}` があるか確認

### 症状: 発火しない（Actions が走らない / skipped）

発火条件は「assignee が ikki-claude **かつ** `agent-ready` ラベルあり」。
どちらか一方だけでは skipped になる（両方揃った時点のイベントで発火）。

---

## 5. 安全設計（守っていること）

- **自己マージしない**: PR 作成までで必ず人間の承認待ちに戻る
- **推測実装しない**: 方針が一意に決まらなければ `agent-blocked` でエスカレーション
- **スコープ拡張しない**: Issue 本文にない機能は追加しない
- **共有ファイル**（`app/css/style.css`・`app/js/state.js`・`app/js/main.js`）を触る場合は
  PR 説明に明記（一次管理: 村上）
