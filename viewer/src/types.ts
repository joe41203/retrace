// DESIGN.md「データスキーマ」に対応する型定義。
// generator が焼く JSON と retrace-generate スキルが追記する explanation の両方をカバーする。

export interface DatasetEntry {
	id: string;
	owner: string;
	repo: string;
	commitCount: number;
}

export interface Repo {
	owner: string;
	repo: string;
	url: string;
	defaultBranch: string;
	headSha: string;
	mainlineCount: number;
	extractedAt: string;
}

export interface IndexEntry {
	seq: number;
	sha: string;
	subject: string;
	authorName: string;
	authorDate: string;
	prNumber: number | null;
	filesChanged: number;
	additions: number;
	deletions: number;
	hasExplanation: boolean;
}

export interface IndexFile {
	entries: IndexEntry[];
}

export interface Chapter {
	id: number;
	title: string;
	summary: string;
	startSeq: number;
	endSeq: number;
}

export interface ChaptersFile {
	chapters: Chapter[];
}

export interface PullRequest {
	number: number;
	title: string;
	body: string;
	url: string;
}

export interface LinkedIssue {
	number: number;
	title: string;
	body: string;
	url: string;
}

export interface CommitFile {
	path: string;
	status: string; // 'A' | 'M' | 'D' | 'R' | 'C' | ...
	additions: number;
	deletions: number;
	binary: boolean;
	oldPath?: string; // rename/copy 時の旧パス(generator が付与。スキーマ外の加算フィールド)
}

export type Evidence = "pr" | "issue" | "message" | "inferred";

export interface HighlightNote {
	file: string;
	note: string;
}

export interface Ref {
	type: string; // 'pr' | 'issue' | ...
	number: number;
	url: string;
}

export interface Diagram {
	mermaid: string;
	caption: string;
}

export interface LangNote {
	topic: string;
	note: string;
}

export interface Explanation {
	what: string;
	why: string;
	highlights: HighlightNote[];
	langNotes?: LangNote[] | null; // 任意。言語・フレームワーク固有概念の学習メモ(0〜4件)
	diagram?: Diagram | null; // 任意。構造理解を助けるコミットのみ付く
	evidence: Evidence;
	refs: Ref[];
	model: string;
	generatedAt: string;
}

export interface Commit {
	seq: number;
	sha: string;
	parents: string[];
	author: { name: string; email: string; date: string };
	message: string;
	pr: PullRequest | null;
	linkedIssues: LinkedIssue[];
	stats: { filesChanged: number; additions: number; deletions: number };
	files: CommitFile[];
	diff: string;
	diffTruncated: boolean;
	tree: string[];
	explanation: Explanation | null;
}
