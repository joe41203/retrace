// diff のシンタックスハイライト用。refractor(core)に必要言語だけ登録し、
// 拡張子から言語を判定する。react-diff-view の tokenize に refractor を渡して使う。
import { refractor } from "refractor/lib/core.js";
import bash from "refractor/lang/bash.js";
import css from "refractor/lang/css.js";
import go from "refractor/lang/go.js";
import javascript from "refractor/lang/javascript.js";
import json from "refractor/lang/json.js";
import jsx from "refractor/lang/jsx.js";
import markdown from "refractor/lang/markdown.js";
import markup from "refractor/lang/markup.js"; // html/xml/svg
import tsx from "refractor/lang/tsx.js";
import typescript from "refractor/lang/typescript.js";
import yaml from "refractor/lang/yaml.js";

// markdown は markup-templating に依存しないが、tsx/jsx は javascript/markup に依存するため順序に注意。
for (const lang of [
	markup,
	css,
	javascript,
	json,
	bash,
	yaml,
	markdown,
	go,
	typescript,
	jsx,
	tsx,
]) {
	refractor.register(lang);
}

export { refractor };

// 拡張子 -> refractor 言語名。DESIGN.md の最低カバー: Go/TS/JS/JSON/YAML/Markdown/shell/CSS/HTML。
const EXT_TO_LANG: Record<string, string> = {
	go: "go",
	ts: "typescript",
	tsx: "tsx",
	js: "javascript",
	jsx: "jsx",
	mjs: "javascript",
	cjs: "javascript",
	json: "json",
	yaml: "yaml",
	yml: "yaml",
	md: "markdown",
	markdown: "markdown",
	sh: "bash",
	bash: "bash",
	zsh: "bash",
	css: "css",
	html: "markup",
	htm: "markup",
	xml: "markup",
	svg: "markup",
};

// パスから言語名を返す。未対応拡張子は null(=ハイライトしない)。
export function languageFromPath(path: string): string | null {
	const base = path.split("/").pop() ?? path;
	// Dockerfile / Makefile のような拡張子なしの慣用ファイル
	if (base === "Dockerfile") return null;
	if (base === "Makefile" || base === "makefile") return null;
	const dot = base.lastIndexOf(".");
	if (dot < 0) return null;
	const ext = base.slice(dot + 1).toLowerCase();
	return EXT_TO_LANG[ext] ?? null;
}
