---
paths:
  - "DESIGN.md"
  - "viewer/src/types.ts"
  - "generator/validate.mjs"
  - "viewer/scripts/make-fixture.mjs"
  - ".claude/skills/retrace-generate/SKILL.md"
  - ".claude/agents/retrace-explainer.md"
---

# データスキーマ同期ルール

retrace のデータスキーマ(commit JSON / explanation / chapters / index)は次の6箇所に実装が分散している。**スキーマを変える(フィールド追加・型変更・evidence 等の enum 変更)なら、同一の作業内で6箇所すべてを確認し、必要な箇所を漏れなく更新すること**。「あとで直す」は禁止 — 根拠: 2026-07-22 の diagram フィールド追加時、viewer への伝達漏れで3仕様の差し戻しが実際に発生した。

チェックリスト(スキーマ変更時に全項目を確認):

- [ ] `DESIGN.md` — スキーマの正。**必ず最初にここを更新する**
- [ ] `viewer/src/types.ts` — TypeScript 型定義(1:1 対応)
- [ ] `generator/validate.mjs` — 実行時スキーマ検証
- [ ] `viewer/scripts/make-fixture.mjs` — fixture が新フィールドの代表値を網羅しているか
- [ ] `.claude/skills/retrace-generate/SKILL.md` — 生成指示(explanation スキーマの記載)
- [ ] `.claude/agents/retrace-explainer.md` — 解説バッチの出力スキーマ記載
- [ ] `.claude/hooks/check-commit-json.mjs` — 書き込み時の explanation 形状チェック

完了確認: 変更後に `node --test generator/lib.test.mjs`、`node generator/validate.mjs --id fixture__demo`(fixture 再生成後)、`cd viewer && npm run build` の3つが通ること。
