// retrace ジェネレーター共有ユーティリティ
// Node 標準モジュールのみ。git / gh CLI を child_process で呼ぶ。

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// リポジトリルート(このファイルは generator/ 配下)
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CACHE_DIR = path.join(ROOT, ".cache", "repos");
export const DATA_DIR = path.join(ROOT, "data");

// git の空ツリーハッシュ(root コミットの diff 基準)
export const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

// diff 切り詰めのしきい値
export const DIFF_MAX_BYTES = 300 * 1024; // 300KB
export const DIFF_MAX_LINES = 4000;
export const ISSUE_BODY_LIMIT = 10000;
export const MAX_LINKED_ISSUES = 3;

/**
 * コマンドを spawn して stdout を返す。ストリーミングでバッファし、巨大 diff にも耐える。
 * @param {string} cmd
 * @param {string[]} args
 * @param {{cwd?: string, allowFail?: boolean, input?: string}} [opts]
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const out = [];
    const err = [];
    child.stdout.on("data", (d) => out.push(d));
    child.stderr.on("data", (d) => err.push(d));
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      const stdout = Buffer.concat(out).toString("utf8");
      const stderr = Buffer.concat(err).toString("utf8");
      if (code !== 0 && !opts.allowFail) {
        const e = new Error(`${cmd} ${args.join(" ")} exited ${code}\n${stderr}`);
        e.code = code;
        e.stdout = stdout;
        e.stderr = stderr;
        return reject(e);
      }
      resolve({ stdout, stderr, code });
    });
    if (opts.input != null) {
      child.stdin.write(opts.input);
    }
    child.stdin.end();
  });
}

/** git を cwd 指定で実行し stdout を返す */
export async function git(cwd, args, opts = {}) {
  const r = await run("git", args, { cwd, ...opts });
  return r.stdout;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * gh api を叩く。403/429(レート/セカンダリ制限)は指数バックオフでリトライ。
 * 404 は null を返す(存在しない issue/pr など)。
 * @param {string} endpoint 例 "repos/o/r/commits/{sha}/pulls"
 * @param {{maxRetries?: number}} [opts]
 * @returns {Promise<any|null>}
 */
export async function ghApi(endpoint, opts = {}) {
  const maxRetries = opts.maxRetries ?? 3;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const r = await run("gh", ["api", endpoint, "-H", "Accept: application/vnd.github+json"], {
      allowFail: true,
    });
    if (r.code === 0) {
      try {
        return JSON.parse(r.stdout);
      } catch {
        return null;
      }
    }
    const combined = `${r.stdout}\n${r.stderr}`;
    // 404 → 存在しない。リトライ不要
    if (/HTTP 404|Not Found/i.test(combined)) {
      return null;
    }
    // 403 / 429 / secondary rate limit → バックオフ
    const rateLimited =
      /HTTP 403|HTTP 429|rate limit|secondary rate|abuse detection/i.test(combined);
    if (rateLimited && attempt < maxRetries) {
      const wait = Math.min(60000, 2000 * 2 ** attempt);
      console.warn(
        `  [rate-limit] ${endpoint} — ${wait / 1000}s 待機してリトライ (${attempt + 1}/${maxRetries})`,
      );
      await sleep(wait);
      continue;
    }
    // それ以外のエラー、またはリトライ尽きた → null(紐付けなしとして扱う)
    if (attempt >= maxRetries) {
      console.warn(`  [gh-api-fail] ${endpoint}: ${r.stderr.trim().split("\n")[0] ?? ""}`);
      return null;
    }
    // 一時的なネットワーク等: 軽くリトライ
    await sleep(1000 * (attempt + 1));
  }
  return null;
}

/** seq(1始まり) と sha からコミット JSON のファイル名を作る */
export function commitFileName(seq, sha) {
  return `${String(seq).padStart(4, "0")}-${sha.slice(0, 7)}.json`;
}

// ---- diff のファイル単位分割・切り詰め -------------------------------------

/**
 * unified diff 全文を "diff --git" 境界でファイル単位のチャンクに分割する。
 * 先頭に "diff --git" 前のテキストがあれば preamble として保持(通常は空)。
 */
export function splitDiffByFile(diffText) {
  if (!diffText) return { preamble: "", chunks: [] };
  const lines = diffText.split("\n");
  const chunks = [];
  let current = null;
  const preamble = [];
  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      if (current) chunks.push(current);
      current = { header: line, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (current) chunks.push(current);
  return { preamble: preamble.join("\n"), chunks };
}

/**
 * diff 全体が DIFF_MAX_BYTES または DIFF_MAX_LINES を超える場合、
 * 大きいファイルのチャンクを省略プレースホルダに置換する。
 * ファイルヘッダ部(diff --git / index / --- / +++)は残し、hunk 本体だけを潰す。
 * @returns {{diff: string, truncated: boolean}}
 */
export function truncateDiff(diffText) {
  const byteLen = Buffer.byteLength(diffText, "utf8");
  const lineLen = diffText.length === 0 ? 0 : diffText.split("\n").length;
  if (byteLen <= DIFF_MAX_BYTES && lineLen <= DIFF_MAX_LINES) {
    return { diff: diffText, truncated: false };
  }

  const { preamble, chunks } = splitDiffByFile(diffText);
  if (chunks.length === 0) {
    return { diff: diffText, truncated: false };
  }

  const sized = chunks.map((c, i) => {
    const text = c.lines.join("\n");
    return { i, chunk: c, bytes: Buffer.byteLength(text, "utf8"), lines: c.lines.length, text };
  });
  const collapsed = new Set();

  // 省略後のチャンクは「ファイルヘッダ行群 + プレースホルダ1行」になる。
  // hunk が始まる @@ より前(diff --git / index / --- / +++ / rename 等)は残す。
  function collapsedText(s) {
    const head = [];
    for (const line of s.chunk.lines) {
      if (line.startsWith("@@")) break;
      head.push(line);
    }
    head.push("[retrace: このファイルの diff は省略されました]");
    return head.join("\n");
  }
  const collapsedBytes = (s) => Buffer.byteLength(collapsedText(s), "utf8");
  const collapsedLines = (s) => collapsedText(s).split("\n").length;

  const totalBytes = () =>
    sized.reduce(
      (acc, s) => acc + (collapsed.has(s.i) ? collapsedBytes(s) : s.bytes) + 1,
      Buffer.byteLength(preamble, "utf8"),
    );
  const totalLines = () =>
    sized.reduce(
      (acc, s) => acc + (collapsed.has(s.i) ? collapsedLines(s) : s.lines) + 1,
      preamble ? preamble.split("\n").length : 0,
    );

  // 大きい順に、しきい値を下回るまで潰す。
  const order = [...sized].sort((a, b) => b.bytes - a.bytes);
  for (const s of order) {
    if (totalBytes() <= DIFF_MAX_BYTES && totalLines() <= DIFF_MAX_LINES) break;
    collapsed.add(s.i);
  }

  const parts = [];
  if (preamble) parts.push(preamble);
  for (const s of sized) {
    parts.push(collapsed.has(s.i) ? collapsedText(s) : s.text);
  }
  return { diff: parts.join("\n"), truncated: collapsed.size > 0 };
}

/** owner/repo 文字列を検証してパース */
export function parseRepoArg(repoArg) {
  const m = /^([^/\s]+)\/([^/\s]+)$/.exec(repoArg ?? "");
  if (!m) {
    throw new Error(`--repo は <owner>/<repo> 形式で指定してください: ${repoArg}`);
  }
  return { owner: m[1], repo: m[2], id: `${m[1]}__${m[2]}` };
}
