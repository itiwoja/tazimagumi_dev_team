# GitHub Issues とガントチャート v2.2 の同期・整合

## 目的

`itiwoja/tazimagumi_dev_team` の GitHub Issues を進捗情報の正として、既存の未コミット実装を完成させる。`docs/schedule/ガントチャート_v2.2.md` の自動同期ブロックと手動の提案スケジュールを矛盾させず、8月31日の M-MVP 公開までの依存順を明確にする。

## 現状

- 作業ブランチ `docs/gantt-progress-20260714` は `origin/develop` の現在値 `7964b02` から作成済み。
- 同じ目的の未コミット変更がすでに存在する。これらを上書き・破棄せず、差分を精査して不足だけを直す。
- `node scripts/sync-gantt-issues.mjs --check` は現在成功するが、`scripts/gantt-issue-map.json` の日程が旧 v2.1 のままで、v2.2 手動計画と矛盾する。
- GitHub 全 Issue は80件。Project fields はトークン権限不足で取得できないため、Issue本体の state/title/assignees/labels/milestone/updatedAt/closedAt を使う。

## 情報源の優先順位

1. Issue のタイトル・open/closed・担当・緊急度ラベル・マイルストーン・更新/完了日時: GitHub Issues
2. 公開前の順序と依存: Issue #109（特に #105 → #60/#61、#54 → #37、#41 → #108 → #46）
3. 正確な提案日程・安定したガントID・同期対象範囲: `scripts/gantt-issue-map.json`
4. PR競合、Revert、develop統合可否などのリリース準備状態: v2.2 の手動記述。Issue closed と同一視しない。

## 実装範囲

- `docs/schedule/ガントチャート_v2.2.md`
- `scripts/gantt-issue-map.json`
- `scripts/sync-gantt-issues.mjs`
- `scripts/test-sync-gantt-issues.mjs`
- `.github/workflows/sync-gantt-issues.yml`
- `.github/workflows/pr-check.yml`（同期スクリプトの単体テスト追加のみ）
- 必要な参照更新のみ: `AGENTS.md`、`CLAUDE.md`、`README.md`、`docs/README.md`、`docs/dev/ブランチ運用ルール_v1.0.md`、`docs/dev/基盤完成チェックリスト_M-Base_v1.0.md`
- このbrief自身

`app/`、共有ファイル、GitHub Issues/PR本体は変更しない。既存の旧ガント削除差分はユーザー変更として保持し、勝手に復元・追加削除しない。

## 日程の決着

公開前の未完了Issueは、v2.2 手動計画と #109 の依存順に合わせる。

- #105: 07/14–07/16
- #54、#30、#31、#32: 07/14–07/24（データ前提を先に整える）
- #66: 07/17–07/22
- #36、#60: 07/17–07/24 または依存を満たす同等の期間
- #37 は Issue closed の履歴行として扱い、残る画面結線は #61 に分離する
- #61、#67、#92: 07/25–08/03 の範囲で依存順に配置
- #39: 07/20–08/03
- #84、#85: 現在のレビュー待ちを反映し、07/14–07/18
- #110: 毎週統合として 07/17–08/28
- #41: 08/04–08/09
- #42: 08/10–08/18（必ず #46 より前）
- #90: 08/04–08/18 の公開前範囲
- #108: 08/19–08/22
- #43: 08/19–08/24
- #46: 08/25–08/31、M-MVP期限 08/31
- #18: #109 の「発表準備」側へ移し、公開後〜発表前に配置
- #28: MVP外として 09/15–10/09
- #47: 公開後 09/01–09/25
- #44/#45: 11月の発表準備
- #59 は #105 の方針Bの場合のみ公開前。方針未決定のため固定日程の自動同期対象には入れず、その理由を文書に残す。

完了済みIssueの予定期間を変更する場合は、v2.2 の完了集約と矛盾しない過去日付にする。未来期間の `done` 行を残さない。

## 自動同期仕様

- 同期表に少なくとも Issue、タスク、Issue状態、担当、緊急度、マイルストーン、最終更新、完了日を反映する。
- 表示は「Issue状態」であり、「develop統合済み」「リリース準備完了」を意味しないと明記する。
- GitHubから `labels`、`milestone`、`closedAt` も取得する。
- タイトルのタグ除去、Markdown表エスケープ、Mermaidを壊す区切り文字/改行の正規化を行う。
- 表示上の同期日は `Asia/Tokyo` の暦日を使う。
- 欠落Issue、重複ガントID、重複Issue番号、不正な日付範囲は明示的に失敗させる。
- Workflow は milestone の付与/解除でも同期し、`develop` へ直接pushせず同期PRを作る。
- マッピングや同期コードの `develop` 更新でも同期PRを作り、PR品質ゲートで同期スクリプトの単体テストを実行する。

## 受け入れ条件

1. `node --test scripts/test-sync-gantt-issues.mjs` が成功し、次を検証する。
   - open/closed、担当なし、緊急度、マイルストーン、完了日
   - Markdown/Mermaidの安全な文字正規化
   - 同期ブロック以外を保持
   - 欠落Issue、重複ID/Issue、start > end の拒否
   - JST同期日
2. `node scripts/sync-gantt-issues.mjs` を実行後、`node scripts/sync-gantt-issues.mjs --check` が成功する。
3. 生成表とJSONの日程で #42 < #108/#43 < #46 の公開順が確認できる。
4. #54/#60/#61/#66/#67/#84/#85/#90/#92/#110/#28 が、適切な公開前/公開後セクションに存在する。
5. #59 を固定日程から除外した理由が明記される。
6. #37/#38 の Issue closed と、未マージPR/Revertによる統合準備未完了が混同されない。
7. `docs/dev/基盤完成チェックリスト_M-Base_v1.0.md` が存在しない `★mbase`/誤った節を参照しない。
8. `git diff --check` が成功し、旧 v1.0/v2.0 への残存リンクがない。
9. `app/` と共有ファイルに差分がない。秘密情報を追加しない。

## レビュー時の注意

- GitHub Issue の closed は実装・文書作業のIssue状態に限る。PR #137未統合、PR #139 Revertなどは手動の統合状態に残す。
- `createdAt`/`updatedAt` を予定日として推定しない。
- Project fields は取得できないため、取得できたように記述しない。
- 日程をさらに変更する必要がある場合も、8/31公開と上記依存順を崩さない。
