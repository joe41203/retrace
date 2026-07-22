#!/usr/bin/env node
// lib.mjs の純粋関数のテスト(Node 標準 test runner)。
// 実行: node --test generator/lib.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  splitDiffByFile,
  truncateDiff,
  commitFileName,
  parseRepoArg,
  DIFF_MAX_BYTES,
  DIFF_MAX_LINES,
} from "./lib.mjs";

// 指定バイト数のダミー hunk を持つファイル diff チャンクを作る
function fileChunk(name, hunkLines) {
  const body = Array.from({ length: hunkLines }, (_, i) => `+line ${i}`).join("\n");
  return [
    `diff --git a/${name} b/${name}`,
    `index 111..222 100644`,
    `--- a/${name}`,
    `+++ b/${name}`,
    `@@ -0,0 +1,${hunkLines} @@`,
    body,
  ].join("\n");
}

test("commitFileName: 4桁ゼロ埋め + sha 先頭7桁", () => {
  assert.equal(commitFileName(1, "a1b2c3d4e5"), "0001-a1b2c3d.json");
  assert.equal(commitFileName(202, "deadbeefcafe"), "0202-deadbee.json");
});

test("parseRepoArg: owner/repo をパース", () => {
  assert.deepEqual(parseRepoArg("nakabonne/ali"), {
    owner: "nakabonne",
    repo: "ali",
    id: "nakabonne__ali",
  });
  assert.throws(() => parseRepoArg("bad"));
  assert.throws(() => parseRepoArg("a/b/c"));
});

test("splitDiffByFile: ファイル境界で分割", () => {
  const diff = [fileChunk("a.go", 3), fileChunk("b.go", 3)].join("\n");
  const { preamble, chunks } = splitDiffByFile(diff);
  assert.equal(preamble, "");
  assert.equal(chunks.length, 2);
  assert.match(chunks[0].header, /a\.go/);
  assert.match(chunks[1].header, /b\.go/);
});

test("truncateDiff: しきい値以下はそのまま(truncated=false)", () => {
  const diff = fileChunk("small.go", 5);
  const r = truncateDiff(diff);
  assert.equal(r.truncated, false);
  assert.equal(r.diff, diff);
});

test("truncateDiff: 行数超過で大きいファイルを省略", () => {
  // 小ファイル + 巨大ファイル。合計で DIFF_MAX_LINES を超える。
  const big = fileChunk("big.go", DIFF_MAX_LINES + 100);
  const small = fileChunk("small.go", 5);
  const diff = [small, big].join("\n");
  const r = truncateDiff(diff);
  assert.equal(r.truncated, true);
  // 巨大ファイルはプレースホルダに置換される
  assert.match(r.diff, /\[retrace: このファイルの diff は省略されました\]/);
  // 小ファイルの中身は残る
  assert.match(r.diff, /small\.go/);
  assert.match(r.diff, /\+line 0/);
  // 省略後は行数がしきい値以下
  assert.ok(r.diff.split("\n").length <= DIFF_MAX_LINES, "省略後も行数超過");
  // 省略ファイルのヘッダ(diff --git / --- / +++)は保持される
  assert.match(r.diff, /diff --git a\/big\.go b\/big\.go/);
  assert.match(r.diff, /\+\+\+ b\/big\.go/);
  // 省略ファイルの hunk 本体は消えている
  assert.ok(!r.diff.includes("@@ -0,0 +1," + (DIFF_MAX_LINES + 100)));
});

test("truncateDiff: バイト超過でも省略", () => {
  // 1ファイルで DIFF_MAX_BYTES を超える巨大 diff
  const hunkLines = Math.ceil(DIFF_MAX_BYTES / 8) + 100; // 1行 "+line N" ≒ 8B 以上
  const diff = fileChunk("huge.go", hunkLines);
  assert.ok(Buffer.byteLength(diff, "utf8") > DIFF_MAX_BYTES);
  const r = truncateDiff(diff);
  assert.equal(r.truncated, true);
  assert.ok(Buffer.byteLength(r.diff, "utf8") <= DIFF_MAX_BYTES, "省略後もバイト超過");
});

test("truncateDiff: 空 diff は truncated=false", () => {
  const r = truncateDiff("");
  assert.equal(r.truncated, false);
  assert.equal(r.diff, "");
});
