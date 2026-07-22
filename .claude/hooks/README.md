# hooks/ — フック用スクリプト置き場

このディレクトリ名は**慣習**(公式規定ではない)。フック本体は `settings.json` の `hooks` キーに定義し、スクリプトをここに置いて `${CLAUDE_PROJECT_DIR}/.claude/hooks/<name>` で参照する。「メモリは助言、フックは法律」。

このリポジトリの現役フック:

| スクリプト | トリガー | 役割 |
|---|---|---|
| `check-commit-json.mjs` | PostToolUse (Write\|Edit) | `data/*/commits/*.json` 書き込み直後に単一ファイルのスキーマ検証。解説バッチのサブエージェントが壊れた JSON を書いたら即検知(exit 2 で Claude に理由を返す) |

規約: PostToolUse は高速に(<1s)。ブロック時は stderr に理由を出す(Claude がそれを読んで修正できる)。
