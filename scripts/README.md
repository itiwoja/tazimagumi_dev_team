# scripts/

リポジトリ共通の検証・自動化スクリプト（ビルド不要・Node 標準機能のみ）。

## validate-products.mjs（#73 / 提案-M1）

`app/data/products.js` の必須項目・型・薬機法上の禁止表現を機械チェックする。

```bash
node scripts/validate-products.mjs          # app/data/products.js を検証
node scripts/validate-products.mjs <path>   # 任意のファイルを検証（テスト用）
```

- 違反なし → `OK: N件の商品を検証、問題なし`（exit 0）
- 違反あり → `[ERROR] <id>.<field>: <理由>` を列挙（exit 1）

禁止表現リストは `docs/guidelines/薬機法準拠ガイドライン_v1.0.md` §2 に対応。
`NG_WORDS` 配列を編集して拡張できる。CI（#81）から自動実行される。
