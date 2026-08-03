#!/usr/bin/env node
// retrace データ検証・統計スクリプト
// 使い方: node generator/validate.mjs --repo <owner>/<repo>
//
// data/<owner>__<repo>/ を DESIGN.md のスキーマに照らして検証し、統計を出力する。
// 依存なし(Node 標準モジュールのみ)。

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { ROOT, DATA_DIR, parseRepoArg } from "./lib.mjs";

function parseArgs(argv) {
  const args = { repo: null, id: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo") args.repo = argv[++i];
    else if (a === "--id") args.id = argv[++i];
    else if (a === "-h" || a === "--help") args.help = true;
    else throw new Error(`未知の引数: ${a}`);
  }
  return args;
}

const errors = [];
const warnings = [];
function err(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function isString(v) {
  return typeof v === "string";
}
function isNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}
function isBool(v) {
  return typeof v === "boolean";
}

// ---- 各ファイルのスキーマ検証 ----------------------------------------------

function validateRepoJson(repo) {
  const ctx = "repo.json";
  for (const k of ["owner", "repo", "url", "defaultBranch", "headSha", "extractedAt"]) {
    if (!isString(repo[k])) err(`${ctx}: ${k} が文字列でない`);
  }
  if (!isNumber(repo.mainlineCount)) err(`${ctx}: mainlineCount が数値でない`);
  // commitMode は任意(欠落時は first-parent 扱い)。あるなら enum を守ること。
  if (repo.commitMode !== undefined && !["first-parent", "all"].includes(repo.commitMode)) {
    err(`${ctx}: commitMode が "first-parent" | "all" でない(${repo.commitMode})`);
  }
}

function validateIndexJson(index) {
  const ctx = "index.json";
  if (!index || !Array.isArray(index.entries)) {
    err(`${ctx}: entries 配列がない`);
    return [];
  }
  index.entries.forEach((e, i) => {
    const w = `${ctx}[${i}]`;
    if (!isNumber(e.seq)) err(`${w}: seq が数値でない`);
    if (!isString(e.sha)) err(`${w}: sha が文字列でない`);
    if (!isString(e.subject)) err(`${w}: subject が文字列でない`);
    if (!("prNumber" in e)) err(`${w}: prNumber キーがない`);
    if (e.prNumber !== null && !isNumber(e.prNumber)) err(`${w}: prNumber が number|null でない`);
    if (!isNumber(e.filesChanged)) err(`${w}: filesChanged が数値でない`);
    if (!isBool(e.hasExplanation)) err(`${w}: hasExplanation が真偽値でない`);
  });
  return index.entries;
}

function validateCommit(record, fileName) {
  const ctx = `commits/${fileName}`;
  if (!isNumber(record.seq)) err(`${ctx}: seq`);
  if (!isString(record.sha)) err(`${ctx}: sha`);
  if (!Array.isArray(record.parents)) err(`${ctx}: parents 配列でない`);
  if (!record.author || !isString(record.author.name) || !isString(record.author.date)) {
    err(`${ctx}: author.name/date`);
  }
  if (!isString(record.message)) err(`${ctx}: message`);

  // pr: object | null
  if (record.pr !== null) {
    if (typeof record.pr !== "object") err(`${ctx}: pr が object|null でない`);
    else {
      if (!isNumber(record.pr.number)) err(`${ctx}: pr.number`);
      for (const k of ["title", "body", "url"]) {
        if (!isString(record.pr[k])) err(`${ctx}: pr.${k}`);
      }
    }
  }
  // linkedIssues: array
  if (!Array.isArray(record.linkedIssues)) err(`${ctx}: linkedIssues 配列でない`);
  else {
    record.linkedIssues.forEach((it, i) => {
      if (!isNumber(it.number)) err(`${ctx}: linkedIssues[${i}].number`);
      if (it.pull_request) err(`${ctx}: linkedIssues[${i}] に pull_request がある(PR混入)`);
    });
  }
  // stats
  if (!record.stats || !isNumber(record.stats.filesChanged)) err(`${ctx}: stats.filesChanged`);
  if (!isNumber(record.stats?.additions)) err(`${ctx}: stats.additions`);
  if (!isNumber(record.stats?.deletions)) err(`${ctx}: stats.deletions`);
  // files
  if (!Array.isArray(record.files)) err(`${ctx}: files 配列でない`);
  else {
    record.files.forEach((f, i) => {
      const w = `${ctx}: files[${i}]`;
      if (!isString(f.path)) err(`${w}.path`);
      if (!isString(f.status)) err(`${w}.status`);
      if (!isNumber(f.additions)) err(`${w}.additions`);
      if (!isNumber(f.deletions)) err(`${w}.deletions`);
      if (!isBool(f.binary)) err(`${w}.binary`);
    });
    if (record.files.length !== record.stats?.filesChanged) {
      warn(`${ctx}: files.length(${record.files.length}) ≠ stats.filesChanged(${record.stats?.filesChanged})`);
    }
  }
  // diff
  if (!isString(record.diff)) err(`${ctx}: diff が文字列でない`);
  if (!isBool(record.diffTruncated)) err(`${ctx}: diffTruncated が真偽値でない`);
  // tree
  if (!Array.isArray(record.tree)) err(`${ctx}: tree 配列でない`);
  // explanation: null または object
  if (record.explanation !== null && typeof record.explanation !== "object") {
    err(`${ctx}: explanation が null|object でない`);
  }
  if (record.explanation && typeof record.explanation === "object") {
    validateExplanation(record.explanation, ctx);
  }
}

function validateExplanation(exp, ctx) {
  if (!isString(exp.what)) err(`${ctx}: explanation.what`);
  if (!isString(exp.why)) err(`${ctx}: explanation.why`);
  if (!Array.isArray(exp.highlights)) err(`${ctx}: explanation.highlights 配列でない`);
  const validEvidence = ["pr", "issue", "message", "inferred"];
  if (!validEvidence.includes(exp.evidence)) {
    err(`${ctx}: explanation.evidence が ${validEvidence.join("|")} でない (=${exp.evidence})`);
  }
  if (!Array.isArray(exp.refs)) err(`${ctx}: explanation.refs 配列でない`);
  // langNotes は任意(言語学習メモ)。存在するなら {topic, note} の配列。
  if ("langNotes" in exp && exp.langNotes != null) {
    if (!Array.isArray(exp.langNotes)) {
      err(`${ctx}: explanation.langNotes 配列でない`);
    } else {
      for (const note of exp.langNotes) {
        if (!isString(note?.topic) || !isString(note?.note)) {
          err(`${ctx}: explanation.langNotes の要素が { topic, note } でない`);
        }
      }
    }
  }
  // diagram は任意。存在するなら null または { mermaid, caption } object。
  if ("diagram" in exp && exp.diagram !== null) {
    if (typeof exp.diagram !== "object") {
      err(`${ctx}: explanation.diagram が null|object でない`);
    } else {
      if (!isString(exp.diagram.mermaid)) err(`${ctx}: explanation.diagram.mermaid`);
      if (!isString(exp.diagram.caption)) err(`${ctx}: explanation.diagram.caption`);
    }
  }
}

// ---- メイン ----------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.repo && !args.id)) {
    console.log("使い方: node generator/validate.mjs --repo <owner>/<repo>");
    console.log("        node generator/validate.mjs --id <dataset-id>  (ディレクトリ名で直接指定)");
    process.exit(args.repo || args.id ? 0 : 1);
  }
  // --repo 優先。--id はディレクトリ名(fixture 等、owner/repo と異なる命名)を直接指定する用。
  let id, owner, repo;
  if (args.repo) {
    ({ id, owner, repo } = parseRepoArg(args.repo));
  } else {
    id = args.id;
    owner = repo = id; // 表示用の暫定値。repo.json 読み込み後に上書きする。
  }
  const outDir = path.join(DATA_DIR, id);
  if (!fs.existsSync(outDir)) {
    console.error(`[validate] データがありません: ${path.relative(ROOT, outDir)}`);
    process.exit(1);
  }

  // repo.json
  let repoJson = null;
  try {
    repoJson = JSON.parse(await fsp.readFile(path.join(outDir, "repo.json"), "utf8"));
    validateRepoJson(repoJson);
    // --id 指定時は repo.json の owner/repo を表示に使う
    if (args.id) {
      owner = repoJson.owner ?? owner;
      repo = repoJson.repo ?? repo;
    }
  } catch (e) {
    err(`repo.json 読み込み失敗: ${e.message}`);
  }

  // index.json
  let entries = [];
  try {
    const index = JSON.parse(await fsp.readFile(path.join(outDir, "index.json"), "utf8"));
    entries = validateIndexJson(index);
  } catch (e) {
    err(`index.json 読み込み失敗: ${e.message}`);
  }

  // datasets.json(存在すれば当該 id が含まれるか)
  const datasetsPath = path.join(DATA_DIR, "datasets.json");
  if (fs.existsSync(datasetsPath)) {
    try {
      const ds = JSON.parse(await fsp.readFile(datasetsPath, "utf8"));
      if (!Array.isArray(ds)) err("datasets.json が配列でない");
      else if (!ds.some((d) => d.id === id)) err(`datasets.json に ${id} が無い`);
    } catch (e) {
      err(`datasets.json 読み込み失敗: ${e.message}`);
    }
  } else {
    warn("datasets.json が存在しない");
  }

  // commits/*.json
  const commitsDir = path.join(outDir, "commits");
  const commitFiles = fs.existsSync(commitsDir)
    ? (await fsp.readdir(commitsDir)).filter((f) => f.endsWith(".json")).sort()
    : [];

  let prLinked = 0;
  let issueTotal = 0;
  let truncated = 0;
  let withExplanation = 0;
  let totalAdditions = 0;
  let totalDeletions = 0;
  const seqSeen = new Set();
  const evidenceCount = { pr: 0, issue: 0, message: 0, inferred: 0 };

  for (const fileName of commitFiles) {
    let record;
    try {
      record = JSON.parse(await fsp.readFile(path.join(commitsDir, fileName), "utf8"));
    } catch (e) {
      err(`commits/${fileName} パース失敗: ${e.message}`);
      continue;
    }
    validateCommit(record, fileName);
    if (seqSeen.has(record.seq)) err(`seq 重複: ${record.seq} (${fileName})`);
    seqSeen.add(record.seq);
    if (record.pr) prLinked++;
    if (Array.isArray(record.linkedIssues)) issueTotal += record.linkedIssues.length;
    if (record.diffTruncated) truncated++;
    totalAdditions += record.stats?.additions ?? 0;
    totalDeletions += record.stats?.deletions ?? 0;
    if (record.explanation) {
      withExplanation++;
      if (evidenceCount[record.explanation.evidence] != null) {
        evidenceCount[record.explanation.evidence]++;
      }
    }
  }

  // 整合性: index の件数と commits ファイル数
  if (entries.length !== commitFiles.length) {
    warn(`index.entries(${entries.length}) ≠ commits ファイル数(${commitFiles.length})`);
  }
  // mainlineCount 整合
  if (repoJson && repoJson.mainlineCount !== commitFiles.length) {
    warn(`repo.mainlineCount(${repoJson.mainlineCount}) ≠ commits ファイル数(${commitFiles.length})`);
  }
  // seq 連番チェック
  for (let s = 1; s <= commitFiles.length; s++) {
    if (!seqSeen.has(s)) warn(`seq ${s} が欠番`);
  }
  // index の hasExplanation と実データの整合
  const indexHasExp = entries.filter((e) => e.hasExplanation).length;
  if (indexHasExp !== withExplanation) {
    warn(`index.hasExplanation=true(${indexHasExp}) ≠ 実 explanation 数(${withExplanation})`);
  }

  const n = commitFiles.length || 1;
  console.log(`\n=== retrace validate: ${owner}/${repo} ===`);
  console.log(`  commits:            ${commitFiles.length}`);
  console.log(`  PR 紐付け:          ${prLinked} (${((prLinked / n) * 100).toFixed(1)}%)`);
  console.log(`  linkedIssues 総数:  ${issueTotal}`);
  console.log(`  diffTruncated:      ${truncated}`);
  console.log(`  explanation あり:   ${withExplanation} (${((withExplanation / n) * 100).toFixed(1)}%)`);
  if (withExplanation > 0) {
    console.log(
      `    evidence 内訳:    pr=${evidenceCount.pr} issue=${evidenceCount.issue} message=${evidenceCount.message} inferred=${evidenceCount.inferred}`,
    );
  }
  console.log(`  総 additions/deletions: +${totalAdditions} / -${totalDeletions}`);

  // data ディレクトリサイズ
  const size = await dirSize(outDir);
  console.log(`  data サイズ:        ${(size / 1024 / 1024).toFixed(2)} MB`);

  console.log("");
  if (warnings.length) {
    console.log(`⚠ 警告 ${warnings.length} 件:`);
    for (const w of warnings.slice(0, 30)) console.log(`  - ${w}`);
    if (warnings.length > 30) console.log(`  … ほか ${warnings.length - 30} 件`);
  }
  if (errors.length) {
    console.log(`✗ エラー ${errors.length} 件:`);
    for (const e of errors.slice(0, 50)) console.log(`  - ${e}`);
    if (errors.length > 50) console.log(`  … ほか ${errors.length - 50} 件`);
    process.exit(1);
  }
  console.log("✓ スキーマ検証 OK");
}

async function dirSize(dir) {
  let total = 0;
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) total += await dirSize(p);
    else {
      const st = await fsp.stat(p);
      total += st.size;
    }
  }
  return total;
}

main().catch((e) => {
  console.error("[validate] 失敗:", e.message);
  process.exit(1);
});
