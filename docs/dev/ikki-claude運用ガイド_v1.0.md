# ikki-claude 運用ガイド v1.1

Issue を `ikki-claude` にアサインすると、GitHub Actions が Claude Code を起動して
**調査・計画 → 実装・テスト → `develop` 向け PR 作成**までを行う仕組みの運用手順。

調査・計画と実装でモデルを切り替える（**調査・計画: Fable 5 ／ 実装・テスト: Sonnet 5**）。

- ワークフロー本体: [`.github/workflows/agent-issue.yml`](../../.github/workflows/agent-issue.yml)
- 起票テンプレート: [`.github/ISSUE_TEMPLATE/agent_task.md`](../../.github/ISSUE_TEMPLATE/agent_task.md)

> **更新履歴**
> - v1.1 (2026-07-21): 2フェーズ化＋モデル切り替えに対応。人間の Opus 事前計画を
>   フェーズ1（Fable 5 自動計画）に置き換え。計画フェーズが自律可否ゲートを兼ねる。
> - v1.0: 初版（単一モデルで調査〜実装を一括実行）。

---

## 1. 全体フロー

```
[起票] ラフに Issue を書く（ゴール・受け入れ基準・スコープ外）※計画の手書きは不要
   ↓
[発火] ikki-claude をアサイン ＋ agent-ready ラベル
   ↓  （GitHub Webhook: issues assigned/labeled で発火）
[フェーズ1 調査・計画] Fable 5（素の claude CLI, read-only）が既存コードを調査して
   実装計画を生成 → Issue にコメントで記録
   ├─ autonomy=auto（推測なしで実装可）      → フェーズ2 へ自動で進む
   └─ needs_review / human_only / 曖昧点あり → agent-blocked にして人間へ返す（実装しない）
   ↓
[フェーズ2 実装・テスト] Sonnet 5（claude-code-action）が計画どおりに実装・テスト
   → develop 向け PR 作成（自己マージはしない）
   ↓
[レビュー] agent-review ラベル＋PRコメント。人間が確認してマージ
```

**モデル切り替えの実体**: 各フェーズの step が `--model` を固定する。
フェーズ1は素の `claude -p --model claude-fable-5`、フェーズ2は
claude-code-action の `claude_args: --model claude-sonnet-5`。
どちらも同じサブスク OAuth トークン（`CLAUDE_CODE_OAUTH_TOKEN`）で認証する。

> **なぜフェーズ1は claude-code-action を使わないのか**: claude-code-action は
> read-only ツール指定でも内部でブランチ/PRを作りうるため、「git 副作用ゼロで
> 計画だけ作る」用途に向かない。フェーズ1は素の CLI を Read/Grep/Glob だけで回し、
> 出力はリポジトリ外の `$RUNNER_TEMP` に置いてフェーズ2のブランチと衝突させない。

### ラベルの状態遷移

| ラベル | 意味 | 誰が付ける |
| --- | --- | --- |
| `agent-ready` | 自律着手してよい | 人間（起票・具体化後） |
| `agent-in-progress` | 実行中（二重発火ロック） | ワークフロー |
| `agent-review` | 実装しPR作成済み。レビュー待ち | ワークフロー（フェーズ2成功） |
| `agent-blocked` | 計画が曖昧 or 実装で停止。人間対応待ち | ワークフロー（計画ゲート or 実装失敗） |

再着手させたいときは `agent-blocked` を外して `agent-ready` を付け直す。

### Actions の成否（緑/赤）の意味

run の成否は「**PRができたか**」に揃えてある。ラベルと必ず一致する。

| run 表示 | 意味 | Issueラベル |
| --- | --- | --- |
| 🟢 success | 実装しPR作成まで到達 | `agent-review` |
| 🔴 failure | 計画ゲートで差し戻し／実装未完了／エラー（＝PRなし） | `agent-blocked` |

> 緑なら必ずPRができている、と読んでよい。`agent-blocked`（正常なエスカレーション含む）は
> 赤で表示される（ラベル・Issueコメントは赤でも必ず書き込まれる）。
> 「正常な差し戻し」も赤になる点に注意（run色は成功/失敗の2値しかないため）。

---

## 2. 起票のコツ（計画はもう書かなくてよい）

以前は人間が Opus で実装計画を詰めてから `agent-ready` を付けていたが、**その工程は
フェーズ1（Fable 5）が自動で肩代わりする**。人間が計画を手書きする必要はない。

代わりに、**フェーズ1が「推測なしで実装できる」と判定できる Issue** を書くことが重要。
計画フェーズは次を出力し、`autonomy=auto` かつ曖昧点ゼロのときだけフェーズ2へ進む:

- **autonomy**: `auto`（実装可）/ `needs_review`（一部人間判断が要る）/ `human_only`
- **plan_markdown**: 実装担当（Sonnet）への指示書（現状把握・変更対象・手順・完了条件）
- **blockers**: 曖昧・不足している点（1つでもあれば実装せず差し戻す）

そのため起票時は、計画本文ではなく**前提を具体的に**書く:

- **ゴール**を1〜2文で一意に
- **受け入れ基準**をチェック可能な形で（フェーズ1の計画・フェーズ2の完了判定の両方に使う）
- **スコープ外**を明記（スコープ膨張を止める。両フェーズが尊重する）
- 任意で「この関数を使って」「このファイルは触らないで」等のヒント（テンプレの任意節）

> 差し戻された（`agent-blocked`）ときは、Issue コメントに記録された計画と
> 「未確定・要判断の点」を見て、Issue本文の曖昧さを潰してから再度 `agent-ready`。

---

## 3. 必要な GitHub Secrets（人間が設定）

リポジトリの Settings → Secrets and variables → Actions に登録する。値はコードに書かない。

| Secret | 生成方法 |
| --- | --- |
| `CLAUDE_CODE_OAUTH_TOKEN` | ローカルで `claude setup-token`（Pro/Max サブスク認証）。**Fable 5 / Sonnet 5 両方のアクセスに使う。有効期限あり・失効したら再生成** |
| `IKKI_CLAUDE_TOKEN` | ikki-claude アカウントの PAT（repo scope） |
| `IKKI_CLAUDE_EMAIL` | ikki-claude で verified な email |
| `IKKI_CLAUDE_USER_ID` | `gh api users/ikki-claude --jq .id` の数値ID |

---

## 4. トラブルシューティング

### 症状: フェーズ1で `agent-blocked`。「計画フェーズを完了できませんでした」

計画フェーズ（Fable 5）自体が失敗している。原因の候補:

- **`CLAUDE_CODE_OAUTH_TOKEN` の失効・不正** → §3 で再生成（下記の再生成手順）
- **サブスクで Fable 5 にアクセスできない** → プラン/権限を確認
- **CLI インストール失敗**（`npm install -g @anthropic-ai/claude-code`）→ 実行ログを確認
- **`--json-schema` 出力の破損** → ログの `plan.err` 相当の出力を確認

再生成手順:
1. ローカルで再生成: `! claude setup-token`（ブラウザ認証 → トークン文字列が出る）
2. その値で `CLAUDE_CODE_OAUTH_TOKEN` Secret を更新（前後の空白・改行を混ぜない）
3. 対象 Issue の `agent-blocked` を外し `agent-ready` を付け直して再発火

補足: `claude -p --model claude-fable-5 --json-schema '{...}' "test"` がローカルで
通るなら、フラグやスキーマは正常。CI だけ落ちるならトークン/モデルアクセスを疑う。

### 症状: フェーズ1で `agent-blocked`。「自律実装を見送りました」

計画は作れたが `autonomy != auto`、または blockers が残った（推測実装を避けて正常に差し戻し）。
→ Issue コメントの計画と「未確定・要判断の点」を見て、**Issue本文を具体化**して再発火（§2）。

### 症状: フェーズ2（実装）で `agent-blocked`。「PR を作成できなかった」

- 計画で想定外の障害・仕様の穴が判明 → 計画コメントを踏まえ Issue を補強して再発火
- gh 未認証で PR 作成に失敗 → ワークフローのフェーズ2ステップに
  `env: GH_TOKEN: ${{ secrets.IKKI_CLAUDE_TOKEN }}` があるか確認

### 症状: SDK execution error → `Claude Code process exited with code 1`（フェーズ2）

「SDK options」を出力した直後（API 呼び出し前、数百ms）に落ちている場合、
**`CLAUDE_CODE_OAUTH_TOKEN` の失効・不正**がほぼ確実。上の再生成手順で対処。

### 症状: 発火しない（Actions が走らない / skipped）

発火条件は「assignee が ikki-claude **かつ** `agent-ready` ラベルあり」。
どちらか一方だけでは skipped になる（両方揃った時点のイベントで発火）。

---

## 5. 安全設計（守っていること）

- **推測実装しない**: フェーズ1（Fable）が計画ゲートを兼ね、方針が一意に決まらなければ
  実装フェーズを走らせず `agent-blocked` でエスカレーション
- **透明性**: フェーズ1の計画は必ず Issue コメントに記録してから実装へ進む
- **自己マージしない**: PR 作成までで必ず人間の承認待ちに戻る
- **スコープ拡張しない**: Issue 本文・計画にない機能は追加しない
- **共有ファイル**（`app/css/style.css`・`app/js/state.js`・`app/js/main.js`）を触る場合は
  PR 説明に明記（一次管理: 村上）
