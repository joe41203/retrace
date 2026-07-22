#!/usr/bin/env node
// PostToolUse hook: data/<id>/commits/NNNN-xxxxxxx.json への Write/Edit 直後に
// 単一ファイルのスキーマ検証を行う。壊れていれば exit 2 で stderr に理由を返す
// (Claude がそれを読んで修正する)。対象外のファイルは即 exit 0。
import { readFileSync } from "node:fs";

const COMMIT_JSON_RE = /data\/[^/]+\/commits\/\d{4}-[0-9a-f]{7}\.json$/;
const EVIDENCE = ["pr", "issue", "message", "inferred"];

function fail(msg) {
  process.stderr.write(`check-commit-json: ${msg}\n`);
  process.exit(2);
}

let input = "";
try {
  input = readFileSync(0, "utf8");
} catch {
  process.exit(0);
}

let filePath = "";
try {
  const hook = JSON.parse(input);
  filePath = hook?.tool_input?.file_path ?? "";
} catch {
  process.exit(0);
}

if (!COMMIT_JSON_RE.test(filePath)) process.exit(0);

let data;
try {
  data = JSON.parse(readFileSync(filePath, "utf8"));
} catch (e) {
  fail(`${filePath} が JSON としてパースできない: ${e.message}`);
}

for (const key of ["seq", "sha", "author", "message", "stats", "files", "diff", "tree"]) {
  if (!(key in data)) fail(`${filePath}: 必須フィールド ${key} が欠落`);
}
if (!("explanation" in data)) fail(`${filePath}: explanation フィールドが欠落(null でも必須)`);

const ex = data.explanation;
if (ex !== null) {
  if (typeof ex !== "object") fail(`${filePath}: explanation はオブジェクトか null`);
  if (typeof ex.what !== "string" || !ex.what) fail(`${filePath}: explanation.what が空`);
  if (typeof ex.why !== "string" || !ex.why) fail(`${filePath}: explanation.why が空`);
  if (!EVIDENCE.includes(ex.evidence)) fail(`${filePath}: evidence は ${EVIDENCE.join("|")} のいずれか`);
  if (!Array.isArray(ex.highlights)) fail(`${filePath}: explanation.highlights は配列`);
  if (ex.evidence === "inferred" && !/おそらく/.test(ex.why))
    fail(`${filePath}: evidence=inferred の why には「おそらく」を含める(反ハルシネーション規律)`);
  if (ex.diagram != null) {
    if (typeof ex.diagram.mermaid !== "string" || typeof ex.diagram.caption !== "string")
      fail(`${filePath}: diagram は { mermaid: string, caption: string } か null`);
  }
}

process.exit(0);
