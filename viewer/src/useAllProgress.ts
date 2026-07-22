// 全データセットの進捗(既読数/総数)をまとめて算出するフック。
// リポジトリ選択画面(RepoPicker)とヘッダーの切替メニュー(RepoSwitcher)の両方で使う。
//
// 総数は各 index.json の entries 数、既読数は localStorage の
// retrace:<id>:read マップに載っている sha のうち index.json に存在するものの数。
import { useEffect, useState } from "react";
import { fetchIndex } from "./data";
import type { DatasetEntry } from "./types";

export interface DatasetProgress {
	total: number; // index.json の総コミット数
	read: number; // うち既読数
	pct: number; // 0-100 の整数
}

function readShaSet(datasetId: string): Set<string> {
	try {
		const raw = localStorage.getItem(`retrace:${datasetId}:read`);
		if (!raw) return new Set();
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return new Set();
		return new Set(Object.keys(parsed));
	} catch {
		return new Set();
	}
}

// datasets を渡すと id -> 進捗 のマップを返す。読み込み中は空マップ。
// deps に「既読を更新しうるトリガー」(例: 現在開いているデータセットの読了数)を
// 渡すと、選択画面へ戻ったときに最新の進捗へ更新できる。
export function useAllProgress(
	datasets: DatasetEntry[] | null,
	refreshKey: unknown = null,
): Record<string, DatasetProgress> {
	const [progress, setProgress] = useState<Record<string, DatasetProgress>>({});

	useEffect(() => {
		if (!datasets || datasets.length === 0) {
			setProgress({});
			return;
		}
		let cancelled = false;
		Promise.all(
			datasets.map(async (d) => {
				try {
					const idx = await fetchIndex(d.id);
					const readSet = readShaSet(d.id);
					const total = idx.entries.length;
					let read = 0;
					for (const e of idx.entries) {
						if (readSet.has(e.sha)) read++;
					}
					const pct = total > 0 ? Math.round((read / total) * 100) : 0;
					return [d.id, { total, read, pct }] as const;
				} catch {
					// index.json が読めないデータセットは commitCount を総数として扱う
					return [d.id, { total: d.commitCount, read: 0, pct: 0 }] as const;
				}
			}),
		).then((pairs) => {
			if (cancelled) return;
			setProgress(Object.fromEntries(pairs));
		});
		return () => {
			cancelled = true;
		};
	}, [datasets, refreshKey]);

	return progress;
}
