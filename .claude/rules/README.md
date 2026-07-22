---
paths:
  - ".claude/rules/**"
---

# rules/ — パス限定ルール

<!-- この README 自体にも paths を付けている: 付けないと常時読込になり毎セッションの context を浪費するため。
     rules/ を編集するときだけ読み込まれる。 -->

`*.md` を置くと毎セッション、または `paths:` にマッチするファイルを Claude が触ったときだけ読み込まれる(再帰探索・サブフォルダ可)。トピックごとに1ファイル。

`paths:` 無し → 常時読込(`.claude/CLAUDE.md` と同格)。`paths:` 有り → 該当ファイル作業時のみ。

例(`testing.md`):

```markdown
---
paths:
  - "viewer/src/**/*.{ts,tsx}"
---

# テスト規約

- 新機能にはテストを必ず添える
```
