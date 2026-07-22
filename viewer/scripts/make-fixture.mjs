#!/usr/bin/env node
// 開発・検証用のデモデータセットを生成する。依存なし(Node 標準のみ)。
//
// 生成物: data/fixture__demo/ に DESIGN.md スキーマ準拠の JSON 一式(2章・コミット6件)。
//   - evidence 4種(pr / issue / message / inferred)を網羅
//   - explanation: null が1件
//   - diffTruncated: true が1件
//   - binary ファイル変更が1件
//   - PR 付き/なし混在
// さらに data/datasets.json に "fixture__demo" エントリを upsert する(既存内容は保持)。

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = resolve(__dirname, '..', '..', 'data');
const DATASET_ID = 'fixture__demo';
const OUT_DIR = join(DATA_ROOT, DATASET_ID);

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

function commitFileName(seq, sha) {
  return `${String(seq).padStart(4, '0')}-${sha.slice(0, 7)}.json`;
}

// --- diff テキストのヘルパ(react-diff-view の parseDiff が読める unified diff) ---

function addFileDiff(path, lines) {
  const body = lines.map((l) => `+${l}`).join('\n');
  return (
    `diff --git a/${path} b/${path}\n` +
    `new file mode 100644\n` +
    `index 0000000..1111111\n` +
    `--- /dev/null\n` +
    `+++ b/${path}\n` +
    `@@ -0,0 +1,${lines.length} @@\n` +
    body +
    '\n'
  );
}

function modifyFileDiff(path, context, removed, added) {
  const oldLen = context.length + removed.length;
  const newLen = context.length + added.length;
  const ctx = context.map((l) => ` ${l}`);
  const del = removed.map((l) => `-${l}`);
  const ins = added.map((l) => `+${l}`);
  return (
    `diff --git a/${path} b/${path}\n` +
    `index aaaaaaa..bbbbbbb 100644\n` +
    `--- a/${path}\n` +
    `+++ b/${path}\n` +
    `@@ -1,${oldLen} +1,${newLen} @@\n` +
    [...ctx, ...del, ...ins].join('\n') +
    '\n'
  );
}

function binaryFileDiff(path) {
  return (
    `diff --git a/${path} b/${path}\n` +
    `new file mode 100644\n` +
    `index 0000000..2222222\n` +
    `Binary files /dev/null and b/${path} differ\n`
  );
}

// 巨大ファイルの diff(500 行超)を作る。ファイル折りたたみのデフォルト挙動を検証するため。
function bigFileDiff(path, lineCount) {
  const lines = [];
  for (let i = 1; i <= lineCount; i++) {
    lines.push(`+line ${i} of generated content in ${path}`);
  }
  return (
    `diff --git a/${path} b/${path}\n` +
    `new file mode 100644\n` +
    `index 0000000..3333333\n` +
    `--- /dev/null\n` +
    `+++ b/${path}\n` +
    `@@ -0,0 +1,${lineCount} @@\n` +
    lines.join('\n') +
    '\n'
  );
}

function iso(daysFromBase) {
  const base = Date.UTC(2021, 0, 5, 9, 0, 0);
  return new Date(base + daysFromBase * 86400_000).toISOString();
}

// --- コミット定義 ---

const commits = [];

// seq 1: Initial commit — PR なし・explanation は message 根拠
{
  const sha = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
  const diff =
    addFileDiff('main.go', [
      'package main',
      '',
      'import "fmt"',
      '',
      'func main() {',
      '\tfmt.Println("hello, retrace")',
      '}',
    ]) +
    addFileDiff('go.mod', ['module github.com/demo/retrace', '', 'go 1.20']);
  commits.push({
    seq: 1,
    sha,
    parents: [],
    author: { name: 'demo-author', email: 'demo@example.com', date: iso(0) },
    message: 'Initial commit\n\nCLI の骨格を用意する。',
    pr: null,
    linkedIssues: [],
    stats: { filesChanged: 2, additions: 10, deletions: 0 },
    files: [
      { path: 'main.go', status: 'A', additions: 7, deletions: 0, binary: false },
      { path: 'go.mod', status: 'A', additions: 3, deletions: 0, binary: false },
    ],
    diff,
    diffTruncated: false,
    tree: ['main.go', 'go.mod'],
    explanation: {
      what: 'CLI の最小構成として main.go と go.mod を追加した。',
      why: 'コミットメッセージに「CLI の骨格を用意する」とあり、プロジェクトの初期化が目的とわかる。',
      highlights: [{ file: 'main.go', note: 'エントリポイント。まだ hello を出すだけ。' }],
      evidence: 'message',
      refs: [],
      model: 'claude-sonnet-5',
      generatedAt: iso(30),
    },
  });
}

// seq 2: attacker パッケージ追加 — PR あり・explanation は pr 根拠
{
  const sha = 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1';
  const diff = addFileDiff('attacker/attacker.go', [
    'package attacker',
    '',
    '// Attacker は対象 URL に負荷をかける。',
    'type Attacker struct {',
    '\tTarget string',
    '\tRate   int',
    '}',
    '',
    'func New(target string, rate int) *Attacker {',
    '\treturn &Attacker{Target: target, Rate: rate}',
    '}',
  ]);
  commits.push({
    seq: 2,
    sha,
    parents: [commits[0].sha],
    author: { name: 'demo-author', email: 'demo@example.com', date: iso(2) },
    message: 'Add attacker package',
    pr: {
      number: 12,
      title: 'Introduce attacker package',
      body: 'This PR introduces the `attacker` package which drives load against a target URL. Closes #3.',
      url: 'https://github.com/demo/retrace/pull/12',
    },
    linkedIssues: [
      {
        number: 3,
        title: 'Need a load generation core',
        body: 'We need a reusable component to generate load so the TUI can visualize it.',
        url: 'https://github.com/demo/retrace/issues/3',
      },
    ],
    stats: { filesChanged: 1, additions: 11, deletions: 0 },
    files: [{ path: 'attacker/attacker.go', status: 'A', additions: 11, deletions: 0, binary: false }],
    diff,
    diffTruncated: false,
    tree: ['main.go', 'go.mod', 'attacker/attacker.go'],
    explanation: {
      what: 'attacker パッケージを新設し、対象 URL に負荷をかける Attacker 型を定義した。',
      why: 'PR「Introduce attacker package」に、TUI から負荷を可視化するための再利用可能なコアが必要と書かれている。',
      highlights: [
        { file: 'attacker/attacker.go', note: 'Target と Rate を持つ最小の負荷生成コア。' },
      ],
      diagram: {
        mermaid:
          'flowchart LR\n  A["CLI (main.go)"] --> B["attacker.New"]\n  B --> C["Attacker{Target, Rate}"]\n  C --> D["対象 URL へ負荷"]',
        caption: 'CLI が attacker パッケージ経由で対象 URL に負荷をかける流れ。',
      },
      evidence: 'pr',
      refs: [
        { type: 'pr', number: 12, url: 'https://github.com/demo/retrace/pull/12' },
        { type: 'issue', number: 3, url: 'https://github.com/demo/retrace/issues/3' },
      ],
      model: 'claude-sonnet-5',
      generatedAt: iso(30),
    },
  });
}

// seq 3: バグ修正 — PR あり(issue 主導)・explanation は issue 根拠
{
  const sha = 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2';
  const diff = modifyFileDiff(
    'attacker/attacker.go',
    ['package attacker', ''],
    ['\tRate   int'],
    ['\tRate   int', '\tTimeout int'],
  );
  commits.push({
    seq: 3,
    sha,
    parents: [commits[1].sha],
    author: { name: 'contributor-b', email: 'b@example.com', date: iso(5) },
    message: 'Fix missing timeout handling',
    pr: {
      number: 21,
      title: 'Add timeout to Attacker',
      body: 'Fixes #18 where requests would hang indefinitely without a timeout.',
      url: 'https://github.com/demo/retrace/pull/21',
    },
    linkedIssues: [
      {
        number: 18,
        title: 'Requests hang forever',
        body: 'When the target is unreachable, the attacker never returns because there is no timeout.',
        url: 'https://github.com/demo/retrace/issues/18',
      },
    ],
    stats: { filesChanged: 1, additions: 1, deletions: 0 },
    files: [{ path: 'attacker/attacker.go', status: 'M', additions: 1, deletions: 0, binary: false }],
    diff,
    diffTruncated: false,
    tree: ['main.go', 'go.mod', 'attacker/attacker.go'],
    explanation: {
      what: 'Attacker に Timeout フィールドを追加し、タイムアウトを扱えるようにした。',
      why: 'issue #18「Requests hang forever」で、対象に到達できないとタイムアウトが無いため応答が返らない問題が報告されていた。',
      highlights: [{ file: 'attacker/attacker.go', note: 'Timeout の追加が本質的な修正点。' }],
      evidence: 'issue',
      refs: [
        { type: 'pr', number: 21, url: 'https://github.com/demo/retrace/pull/21' },
        { type: 'issue', number: 18, url: 'https://github.com/demo/retrace/issues/18' },
      ],
      model: 'claude-sonnet-5',
      generatedAt: iso(30),
    },
  });
}

// seq 4: リファクタ(PR なし・direct push) — explanation は inferred(推測)
{
  const sha = 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3';
  const diff = modifyFileDiff(
    'main.go',
    ['package main', ''],
    ['func main() {', '\tfmt.Println("hello, retrace")', '}'],
    ['func run() error {', '\tfmt.Println("hello, retrace")', '\treturn nil', '}', '', 'func main() {', '\trun()', '}'],
  );
  commits.push({
    seq: 4,
    sha,
    parents: [commits[2].sha],
    author: { name: 'demo-author', email: 'demo@example.com', date: iso(7) },
    message: 'refactor main into run()',
    pr: null,
    linkedIssues: [],
    stats: { filesChanged: 1, additions: 7, deletions: 3 },
    files: [{ path: 'main.go', status: 'M', additions: 7, deletions: 3, binary: false }],
    diff,
    diffTruncated: false,
    tree: ['main.go', 'go.mod', 'attacker/attacker.go'],
    explanation: {
      what: 'main の処理を run() 関数へ切り出し、main からは呼ぶだけにした。',
      why: 'おそらくテスト容易性やエラー伝播のための整理だが、PR も issue も紐づいておらず根拠は無い。',
      highlights: [{ file: 'main.go', note: 'run() が error を返す形に変わっている。' }],
      evidence: 'inferred',
      refs: [],
      model: 'claude-sonnet-5',
      generatedAt: iso(30),
    },
  });
}

// seq 5: 巨大ファイル + binary 追加 — diffTruncated: true, explanation は null(未生成)
{
  const sha = 'e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4';
  const diff =
    bigFileDiff('internal/generated_table.go', 640) + binaryFileDiff('assets/logo.png');
  commits.push({
    seq: 5,
    sha,
    parents: [commits[3].sha],
    author: { name: 'contributor-c', email: 'c@example.com', date: iso(10) },
    message: 'Add generated lookup table and logo asset',
    pr: {
      number: 30,
      title: 'Generate lookup table',
      body: 'Adds a large generated lookup table and the project logo.',
      url: 'https://github.com/demo/retrace/pull/30',
    },
    linkedIssues: [],
    stats: { filesChanged: 2, additions: 640, deletions: 0 },
    files: [
      { path: 'internal/generated_table.go', status: 'A', additions: 640, deletions: 0, binary: false },
      { path: 'assets/logo.png', status: 'A', additions: 0, deletions: 0, binary: true },
    ],
    diff,
    diffTruncated: true,
    tree: [
      'main.go',
      'go.mod',
      'attacker/attacker.go',
      'internal/generated_table.go',
      'assets/logo.png',
    ],
    explanation: null,
  });
}

// seq 6: ドキュメント追加 — PR なし・explanation は message 根拠
{
  const sha = 'f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5';
  const diff = addFileDiff('README.md', [
    '# retrace demo',
    '',
    'A tiny load testing tool used as a retrace fixture.',
  ]);
  commits.push({
    seq: 6,
    sha,
    parents: [commits[4].sha],
    author: { name: 'demo-author', email: 'demo@example.com', date: iso(12) },
    message: 'docs: add README',
    pr: null,
    linkedIssues: [],
    stats: { filesChanged: 1, additions: 3, deletions: 0 },
    files: [{ path: 'README.md', status: 'A', additions: 3, deletions: 0, binary: false }],
    diff,
    diffTruncated: false,
    tree: [
      'main.go',
      'go.mod',
      'attacker/attacker.go',
      'internal/generated_table.go',
      'assets/logo.png',
      'README.md',
    ],
    explanation: {
      what: 'プロジェクトの概要を説明する README を追加した。',
      why: 'コミットメッセージ「docs: add README」の通り、ドキュメント整備が目的。',
      highlights: [{ file: 'README.md', note: 'ツールの位置づけを一文で説明。' }],
      evidence: 'message',
      refs: [],
      model: 'claude-sonnet-5',
      generatedAt: iso(30),
    },
  });
}

// --- ファイル書き出し ---

const repo = {
  owner: 'demo',
  repo: 'retrace',
  url: 'https://github.com/demo/retrace',
  defaultBranch: 'main',
  headSha: commits[commits.length - 1].sha,
  mainlineCount: commits.length,
  extractedAt: iso(30),
};
writeJson(join(OUT_DIR, 'repo.json'), repo);

const indexFile = {
  entries: commits.map((c) => ({
    seq: c.seq,
    sha: c.sha,
    subject: c.message.split('\n')[0],
    authorName: c.author.name,
    authorDate: c.author.date,
    prNumber: c.pr ? c.pr.number : null,
    filesChanged: c.stats.filesChanged,
    additions: c.stats.additions,
    deletions: c.stats.deletions,
    hasExplanation: c.explanation !== null,
  })),
};
writeJson(join(OUT_DIR, 'index.json'), indexFile);

const chapters = {
  chapters: [
    {
      id: 1,
      title: 'プロジェクトの立ち上げ',
      summary: 'CLI の骨格を用意し、負荷生成コアである attacker パッケージを導入した時期。',
      startSeq: 1,
      endSeq: 3,
    },
    {
      id: 2,
      title: '整備とアセット追加',
      summary: 'main のリファクタ、生成テーブルとロゴの追加、README 整備を行った時期。',
      startSeq: 4,
      endSeq: 6,
    },
  ],
};
writeJson(join(OUT_DIR, 'chapters.json'), chapters);

for (const c of commits) {
  writeJson(join(OUT_DIR, 'commits', commitFileName(c.seq, c.sha)), c);
}

// --- datasets.json への upsert(既存エントリを保持) ---

const datasetsPath = join(DATA_ROOT, 'datasets.json');
let datasets = [];
if (existsSync(datasetsPath)) {
  try {
    const parsed = JSON.parse(readFileSync(datasetsPath, 'utf8'));
    if (Array.isArray(parsed)) datasets = parsed;
  } catch {
    // 壊れていたら安全側で空から作り直す(既存が配列でなければどのみち使えない)
    datasets = [];
  }
}

const entry = {
  id: DATASET_ID,
  owner: repo.owner,
  repo: repo.repo,
  commitCount: commits.length,
};
const idx = datasets.findIndex((d) => d && d.id === DATASET_ID);
if (idx >= 0) datasets[idx] = entry;
else datasets.push(entry);

writeJson(datasetsPath, datasets);

console.log(`fixture written to ${OUT_DIR}`);
console.log(`datasets.json now has ${datasets.length} dataset(s): ${datasets.map((d) => d.id).join(', ')}`);
