#!/usr/bin/env node
// retrace 機械抽出スクリプト
// 使い方: node generator/extract.mjs --repo <owner>/<repo> [--force]
//
// git / gh CLI を呼んで DESIGN.md のスキーマ通りに data/<owner>__<repo>/ を生成する。
// LLM は一切使わない。再開可能(既存 commits/*.json はスキップ、--force で上書き)。

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import {
  ROOT,
  CACHE_DIR,
  DATA_DIR,
  EMPTY_TREE,
  ISSUE_BODY_LIMIT,
  MAX_LINKED_ISSUES,
  run,
  git,
  ghApi,
  commitFileName,
  parseRepoArg,
  truncateDiff,
} from "./lib.mjs";

// ---- 引数パース ------------------------------------------------------------

function parseArgs(argv) {
  const args = { force: false, repo: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo") args.repo = argv[++i];
    else if (a === "--force") args.force = true;
    else if (a === "-h" || a === "--help") args.help = true;
    else throw new Error(`未知の引数: ${a}`);
  }
  return args;
}

// ---- clone / fetch ---------------------------------------------------------

async function ensureRepo(owner, repo, id) {
  await fsp.mkdir(CACHE_DIR, { recursive: true });
  const repoDir = path.join(CACHE_DIR, id);
  const url = `https://github.com/${owner}/${repo}.git`;
  if (fs.existsSync(path.join(repoDir, ".git"))) {
    console.log(`[repo] 既存 clone を更新: ${repoDir}`);
    await git(repoDir, ["fetch", "--all", "--tags", "--prune"]);
  } else {
    console.log(`[repo] clone: ${url} → ${repoDir}`);
    await run("git", ["clone", url, repoDir]);
  }
  return repoDir;
}

// GitHub API からリポジトリ情報(defaultBranch / language)をまとめて取得する。
// default_branch が取れない場合はローカルの origin/HEAD から推定する。
async function getRepoInfo(owner, repo, repoDir) {
  // gh api を優先。失敗したら null が返る。
  const info = await ghApi(`repos/${owner}/${repo}`);
  const language = info?.language ?? null; // 主要言語。取れなければ null。
  let defaultBranch = info?.default_branch ?? null;
  if (!defaultBranch) {
    try {
      const out = await git(repoDir, ["symbolic-ref", "refs/remotes/origin/HEAD"], {
        allowFail: true,
      });
      const m = /origin\/(.+)\s*$/.exec(out);
      if (m) defaultBranch = m[1].trim();
    } catch {
      /* ignore */
    }
  }
  return { defaultBranch: defaultBranch ?? "main", language };
}

// ---- files 配列(name-status × numstat の突合) ----------------------------

/**
 * git diff --name-status -M と --numstat -M の出力を突合して files 配列を作る。
 * numstat が "-\t-" のファイルは binary: true。rename は R###(類似度)。
 */
function buildFiles(nameStatusOut, numstatOut) {
  // name-status: "M\tpath" / "A\tpath" / "R100\told\tnew" / "C075\told\tnew"
  const statusByPath = new Map(); // 新パス → status 文字("A"/"M"/"D"/"R"/"C"/"T")
  const oldByPath = new Map(); // 新パス → 旧パス(rename/copy 時)
  for (const raw of nameStatusOut.split("\n")) {
    if (!raw.trim()) continue;
    const cols = raw.split("\t");
    const code = cols[0];
    const letter = code[0]; // R100 → R, M → M
    if ((letter === "R" || letter === "C") && cols.length >= 3) {
      const oldPath = cols[1];
      const newPath = cols[2];
      statusByPath.set(newPath, letter);
      oldByPath.set(newPath, oldPath);
    } else {
      const p = cols[1];
      statusByPath.set(p, letter);
    }
  }

  // numstat: "adds\tdels\tpath" または rename の場合 "adds\tdels\told => new" / "{a => b}/x"
  // -M 付き numstat は "adds\tdels\told\tnew"(NUL 区切りでない通常出力では " => " を含む1カラム)になる。
  // ここでは name-status を正として、numstat から数値を引く。
  const numByPath = new Map(); // 新パス → {additions, deletions, binary}
  for (const raw of numstatOut.split("\n")) {
    if (!raw.trim()) continue;
    const cols = raw.split("\t");
    if (cols.length < 3) continue;
    const addsRaw = cols[0];
    const delsRaw = cols[1];
    // パス部分: rename 時は "old => new" もしくは "dir/{old => new}/f"
    let pathField = cols.slice(2).join("\t");
    const newPath = resolveNumstatPath(pathField);
    const binary = addsRaw === "-" && delsRaw === "-";
    numByPath.set(newPath, {
      additions: binary ? 0 : Number(addsRaw) || 0,
      deletions: binary ? 0 : Number(delsRaw) || 0,
      binary,
    });
  }

  const files = [];
  for (const [p, letter] of statusByPath) {
    const num = numByPath.get(p) ?? { additions: 0, deletions: 0, binary: false };
    const entry = {
      path: p,
      status: letter,
      additions: num.additions,
      deletions: num.deletions,
      binary: num.binary,
    };
    if (oldByPath.has(p)) entry.oldPath = oldByPath.get(p);
    files.push(entry);
  }
  return files;
}

/**
 * numstat のパスフィールドから新パスを取り出す。
 * "old => new" → new
 * "dir/{old => new}/file" → dir/new/file
 * それ以外はそのまま。
 */
function resolveNumstatPath(field) {
  if (field.includes("{") && field.includes("=>")) {
    // dir/{old => new}/file
    return field.replace(/\{[^}]*=>\s*([^}]*)\}/g, "$1").replace(/\/{2,}/g, "/");
  }
  if (field.includes("=>")) {
    // old => new
    const parts = field.split("=>");
    return parts[parts.length - 1].trim();
  }
  return field.trim();
}

// ---- PR / issue 紐付け -----------------------------------------------------

async function fetchPr(owner, repo, sha) {
  const pulls = await ghApi(`repos/${owner}/${repo}/commits/${sha}/pulls`);
  if (!Array.isArray(pulls) || pulls.length === 0) return null;
  const p = pulls[0];
  return {
    number: p.number,
    title: p.title ?? "",
    body: (p.body ?? "").slice(0, ISSUE_BODY_LIMIT),
    url: p.html_url ?? `https://github.com/${owner}/${repo}/pull/${p.number}`,
  };
}

async function fetchLinkedIssues(owner, repo, prBody) {
  if (!prBody) return [];
  const nums = [];
  const seen = new Set();
  for (const m of prBody.matchAll(/#(\d+)/g)) {
    const n = Number(m[1]);
    if (!seen.has(n)) {
      seen.add(n);
      nums.push(n);
    }
    if (nums.length >= MAX_LINKED_ISSUES * 3) break; // 少し多めに拾って PR を弾いた後で 3 件確保
  }
  const issues = [];
  for (const n of nums) {
    if (issues.length >= MAX_LINKED_ISSUES) break;
    const issue = await ghApi(`repos/${owner}/${repo}/issues/${n}`);
    if (!issue) continue;
    // pull_request フィールドがあれば PR。issue ではないのでスキップ。
    if (issue.pull_request) continue;
    issues.push({
      number: issue.number,
      title: issue.title ?? "",
      body: (issue.body ?? "").slice(0, ISSUE_BODY_LIMIT),
      url: issue.html_url ?? `https://github.com/${owner}/${repo}/issues/${n}`,
    });
  }
  return issues;
}

// ---- datasets.json の upsert ------------------------------------------------

async function upsertDataset(entry) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const p = path.join(DATA_DIR, "datasets.json");
  let list = [];
  if (fs.existsSync(p)) {
    try {
      const parsed = JSON.parse(await fsp.readFile(p, "utf8"));
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      console.warn("[datasets] 既存 datasets.json をパースできませんでした。新規作成します。");
    }
  }
  const idx = list.findIndex((d) => d.id === entry.id);
  if (idx >= 0) list[idx] = { ...list[idx], ...entry };
  else list.push(entry);
  await writeJson(p, list);
}

// ---- ヘルパ ----------------------------------------------------------------

async function writeJson(p, obj) {
  await fsp.writeFile(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

// git log -1 の情報をまとめて取得(NUL 区切りフォーマット)
async function readCommitMeta(repoDir, sha) {
  const fmt = ["%H", "%P", "%an", "%ae", "%aI", "%B"].join("%x00");
  const out = await git(repoDir, ["show", "-s", `--format=${fmt}`, sha]);
  const [full, parents, an, ae, aI, body] = out.split("\0");
  return {
    sha: full.trim(),
    parents: parents.trim() ? parents.trim().split(/\s+/) : [],
    author: { name: an, email: ae, date: aI },
    // %B は末尾に改行が付くのでトリム
    message: (body ?? "").replace(/\n+$/, ""),
  };
}

// ---- メイン ----------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.repo) {
    console.log("使い方: node generator/extract.mjs --repo <owner>/<repo> [--force]");
    process.exit(args.repo ? 0 : 1);
  }
  const startedAt = Date.now();
  const { owner, repo, id } = parseRepoArg(args.repo);
  console.log(`[retrace] 抽出開始: ${owner}/${repo}`);

  const repoDir = await ensureRepo(owner, repo, id);
  const { defaultBranch, language } = await getRepoInfo(owner, repo, repoDir);
  console.log(`[repo] defaultBranch = ${defaultBranch} / language = ${language ?? "(不明)"}`);

  // mainline: first-parent を逆順(古い順)
  const revList = await git(repoDir, [
    "rev-list",
    "--reverse",
    "--first-parent",
    `origin/${defaultBranch}`,
  ]).catch(async () => {
    // origin/<branch> が無い場合はローカル参照でリトライ
    return git(repoDir, ["rev-list", "--reverse", "--first-parent", defaultBranch]);
  });
  const shas = revList.split("\n").map((s) => s.trim()).filter(Boolean);
  const mainlineCount = shas.length;
  console.log(`[mainline] ${mainlineCount} コミット`);

  const outDir = path.join(DATA_DIR, id);
  const commitsDir = path.join(outDir, "commits");
  await fsp.mkdir(commitsDir, { recursive: true });

  const headSha = shas[shas.length - 1] ?? "";
  const indexEntries = [];

  let processed = 0;
  let skipped = 0;
  let prLinked = 0;
  let issueCount = 0;
  let truncatedCount = 0;

  for (let i = 0; i < shas.length; i++) {
    const seq = i + 1;
    const sha = shas[i];
    const fileName = commitFileName(seq, sha);
    const outPath = path.join(commitsDir, fileName);

    // 既存スキップ(--force で上書き)。index 用に既存 JSON からメタを拾う。
    if (!args.force && fs.existsSync(outPath)) {
      skipped++;
      try {
        const existing = JSON.parse(await fsp.readFile(outPath, "utf8"));
        indexEntries.push(indexEntryFrom(existing, seq));
        if (existing.pr) prLinked++;
        if (existing.linkedIssues) issueCount += existing.linkedIssues.length;
        if (existing.diffTruncated) truncatedCount++;
      } catch {
        // 壊れた JSON は作り直す
        skipped--;
        await extractOne();
      }
      continue;
    }
    await extractOne();

    async function extractOne() {
      const meta = await readCommitMeta(repoDir, sha);
      const base = meta.parents.length > 0 ? `${sha}^1` : EMPTY_TREE;
      // root コミットは空ツリーとの diff。それ以外は第1親との diff。
      const diffRange = meta.parents.length > 0 ? [`${base}..${sha}`] : [EMPTY_TREE, sha];

      const [rawDiff, nameStatusOut, numstatOut, treeOut] = await Promise.all([
        git(repoDir, ["diff", "-M", ...diffRange]),
        git(repoDir, ["diff", "--name-status", "-M", ...diffRange]),
        git(repoDir, ["diff", "--numstat", "-M", ...diffRange]),
        git(repoDir, ["ls-tree", "-r", "--name-only", sha]),
      ]);

      const files = buildFiles(nameStatusOut, numstatOut);
      const additions = files.reduce((a, f) => a + f.additions, 0);
      const deletions = files.reduce((a, f) => a + f.deletions, 0);
      const { diff, truncated } = truncateDiff(rawDiff);
      if (truncated) truncatedCount++;

      const pr = await fetchPr(owner, repo, sha);
      const linkedIssues = pr ? await fetchLinkedIssues(owner, repo, pr.body) : [];
      if (pr) prLinked++;
      issueCount += linkedIssues.length;

      const tree = treeOut.split("\n").map((s) => s.trim()).filter(Boolean);

      const record = {
        seq,
        sha: meta.sha,
        parents: meta.parents,
        author: meta.author,
        message: meta.message,
        pr,
        linkedIssues,
        stats: { filesChanged: files.length, additions, deletions },
        files,
        diff,
        diffTruncated: truncated,
        tree,
        explanation: null,
      };
      await writeJson(outPath, record);
      indexEntries.push(indexEntryFrom(record, seq));
      processed++;
    }

    if ((processed + skipped) % 20 === 0) {
      console.log(
        `  [進捗] ${processed + skipped}/${mainlineCount}(新規 ${processed} / スキップ ${skipped})`,
      );
    }
  }

  // index.json / repo.json / datasets.json
  indexEntries.sort((a, b) => a.seq - b.seq);
  await writeJson(path.join(outDir, "index.json"), { entries: indexEntries });

  const extractedAt = new Date().toISOString();
  await writeJson(path.join(outDir, "repo.json"), {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}`,
    defaultBranch,
    headSha,
    mainlineCount,
    extractedAt,
  });

  await upsertDataset({ id, owner, repo, commitCount: mainlineCount, language });

  const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("");
  console.log(`[完了] ${owner}/${repo} — ${secs}s`);
  console.log(`  mainline: ${mainlineCount} / 新規: ${processed} / スキップ: ${skipped}`);
  console.log(
    `  PR 紐付け: ${prLinked} (${((prLinked / mainlineCount) * 100).toFixed(1)}%) / linkedIssues: ${issueCount} / diffTruncated: ${truncatedCount}`,
  );
  console.log(`  出力: ${path.relative(ROOT, outDir)}/`);
}

function indexEntryFrom(record, seq) {
  return {
    seq: record.seq ?? seq,
    sha: record.sha,
    subject: (record.message ?? "").split("\n")[0],
    authorName: record.author?.name ?? "",
    authorDate: record.author?.date ?? "",
    prNumber: record.pr?.number ?? null,
    filesChanged: record.stats?.filesChanged ?? 0,
    additions: record.stats?.additions ?? 0,
    deletions: record.stats?.deletions ?? 0,
    hasExplanation: record.explanation != null,
  };
}

main().catch((e) => {
  console.error("[extract] 失敗:", e.message);
  process.exit(1);
});
