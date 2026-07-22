// 左ペインの幅・上下段比率などの UI 設定を localStorage に保存するフック。
// データセット非依存(retrace:ui:* プレフィックス)。
import { useCallback, useState } from "react";

function load(key: string, fallback: number): number {
	try {
		const raw = localStorage.getItem(key);
		if (raw == null) return fallback;
		const n = Number(raw);
		return Number.isFinite(n) ? n : fallback;
	} catch {
		return fallback;
	}
}

// 数値を localStorage に永続化する useState。setter は clamp を通してから保存する。
export function usePersistedNumber(
	key: string,
	fallback: number,
	clamp: (n: number) => number = (n) => n,
): [number, (n: number) => void] {
	const [value, setValue] = useState<number>(() => clamp(load(key, fallback)));

	const set = useCallback(
		(n: number) => {
			const clamped = clamp(n);
			setValue(clamped);
			try {
				localStorage.setItem(key, String(clamped));
			} catch {
				// 保存失敗は無視
			}
		},
		[key, clamp],
	);

	return [value, set];
}
