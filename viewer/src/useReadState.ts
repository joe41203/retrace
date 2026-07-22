// 既読状態と再開位置を localStorage で管理するフック。
// キー規約(DESIGN.md):
//   retrace:<id>:read    -> { [sha]: ISO日時 }
//   retrace:<id>:lastSha -> 再開位置の sha
import { useCallback, useEffect, useState } from "react";

export type ReadMap = Record<string, string>;

function readKey(datasetId: string) {
	return `retrace:${datasetId}:read`;
}
function lastShaKey(datasetId: string) {
	return `retrace:${datasetId}:lastSha`;
}

function loadReadMap(datasetId: string): ReadMap {
	try {
		const raw = localStorage.getItem(readKey(datasetId));
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? (parsed as ReadMap) : {};
	} catch {
		return {};
	}
}

export function loadLastSha(datasetId: string): string | null {
	try {
		return localStorage.getItem(lastShaKey(datasetId));
	} catch {
		return null;
	}
}

export function saveLastSha(datasetId: string, sha: string): void {
	try {
		localStorage.setItem(lastShaKey(datasetId), sha);
	} catch {
		// localStorage 不可でも致命的ではない
	}
}

export function useReadState(datasetId: string) {
	const [readMap, setReadMap] = useState<ReadMap>(() => loadReadMap(datasetId));

	// データセット切替時に読み直す
	useEffect(() => {
		setReadMap(loadReadMap(datasetId));
	}, [datasetId]);

	const persist = useCallback(
		(next: ReadMap) => {
			setReadMap(next);
			try {
				localStorage.setItem(readKey(datasetId), JSON.stringify(next));
			} catch {
				// 保存失敗は無視(容量超過など)
			}
		},
		[datasetId],
	);

	const markRead = useCallback(
		(sha: string) => {
			setReadMap((prev) => {
				if (prev[sha]) return prev; // 既読なら変更しない(日時は初回のまま保持)
				const next = { ...prev, [sha]: new Date().toISOString() };
				try {
					localStorage.setItem(readKey(datasetId), JSON.stringify(next));
				} catch {
					// ignore
				}
				return next;
			});
		},
		[datasetId],
	);

	const toggleRead = useCallback(
		(sha: string) => {
			const next = { ...readMap };
			if (next[sha]) delete next[sha];
			else next[sha] = new Date().toISOString();
			persist(next);
		},
		[readMap, persist],
	);

	const isRead = useCallback((sha: string) => Boolean(readMap[sha]), [readMap]);

	return { readMap, isRead, markRead, toggleRead };
}
