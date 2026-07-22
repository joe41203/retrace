// data/ 配下の JSON を fetch するアクセサ群。
// dev/preview サーバは vite.config.ts のプラグインが /data/* を repo ルートの data/ から配信する。

import type {
	ChaptersFile,
	Commit,
	DatasetEntry,
	IndexFile,
	Repo,
} from "./types";

async function fetchJson<T>(url: string): Promise<T> {
	const res = await fetch(url, { cache: "no-store" });
	if (!res.ok) {
		throw new Error(`${url} -> ${res.status}`);
	}
	return (await res.json()) as T;
}

// 存在しないことが正常なファイル(chapters.json など)用。404 は null に落とす。
async function fetchJsonOptional<T>(url: string): Promise<T | null> {
	try {
		const res = await fetch(url, { cache: "no-store" });
		if (res.status === 404) return null;
		if (!res.ok) throw new Error(`${url} -> ${res.status}`);
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

export function commitFileName(seq: number, sha: string): string {
	return `${String(seq).padStart(4, "0")}-${sha.slice(0, 7)}.json`;
}

export function fetchDatasets(): Promise<DatasetEntry[]> {
	return fetchJson<DatasetEntry[]>("/data/datasets.json");
}

export function fetchRepo(datasetId: string): Promise<Repo | null> {
	return fetchJsonOptional<Repo>(`/data/${datasetId}/repo.json`);
}

export function fetchIndex(datasetId: string): Promise<IndexFile> {
	return fetchJson<IndexFile>(`/data/${datasetId}/index.json`);
}

export function fetchChapters(datasetId: string): Promise<ChaptersFile | null> {
	return fetchJsonOptional<ChaptersFile>(`/data/${datasetId}/chapters.json`);
}

export function fetchCommit(
	datasetId: string,
	seq: number,
	sha: string,
): Promise<Commit> {
	return fetchJson<Commit>(
		`/data/${datasetId}/commits/${commitFileName(seq, sha)}`,
	);
}
