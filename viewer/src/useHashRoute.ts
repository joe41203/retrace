// URL ハッシュで選択状態(データセット / コミット seq)を保持するフック。
// reload やブラウザの戻る/進むで選択が消えないようにする。
//
// ハッシュ書式:
//   #/                      -> 選択画面(データセット未選択)
//   #/<datasetId>           -> データセットのみ(seq は再開位置に委ねる)
//   #/<datasetId>/<seq>     -> データセット + コミット
//
// このフックは「現在ハッシュが表す route」を返し、route を書き換える関数を提供する。
// state の single source of truth は App 側のままにし、ハッシュは同期先として扱う。
import { useCallback, useEffect, useState } from "react";

export interface Route {
	datasetId: string | null;
	seq: number | null;
}

export function parseHash(hash: string): Route {
	// 先頭の "#" と "/" を落としてセグメント化
	const raw = hash.replace(/^#\/?/, "");
	if (!raw) return { datasetId: null, seq: null };
	const [id, seqStr] = raw.split("/");
	const datasetId = id ? decodeURIComponent(id) : null;
	const seqNum = seqStr != null && seqStr !== "" ? Number(seqStr) : NaN;
	const seq = Number.isFinite(seqNum) ? seqNum : null;
	return { datasetId, seq };
}

export function buildHash(
	datasetId: string | null,
	seq: number | null,
): string {
	if (!datasetId) return "#/";
	const id = encodeURIComponent(datasetId);
	return seq != null ? `#/${id}/${seq}` : `#/${id}`;
}

export function useHashRoute(): {
	route: Route;
	// ハッシュを書き換える。履歴を積みたくない同期は replace=true。
	setRoute: (
		datasetId: string | null,
		seq: number | null,
		replace?: boolean,
	) => void;
} {
	const [route, setRouteState] = useState<Route>(() =>
		parseHash(window.location.hash),
	);

	// 外部要因(reload/戻る進む/手動でのハッシュ編集)でハッシュが変わったら追従
	useEffect(() => {
		const onHashChange = () => setRouteState(parseHash(window.location.hash));
		window.addEventListener("hashchange", onHashChange);
		return () => window.removeEventListener("hashchange", onHashChange);
	}, []);

	const setRoute = useCallback(
		(datasetId: string | null, seq: number | null, replace = false) => {
			const next = buildHash(datasetId, seq);
			if (next === window.location.hash) return; // 変化なしなら何もしない
			if (replace) {
				history.replaceState(null, "", next);
				// replaceState は hashchange を発火しないので手動で state を更新
				setRouteState({ datasetId, seq });
			} else {
				// location.hash 代入は hashchange を発火し、上の listener が state を更新
				window.location.hash = next;
			}
		},
		[],
	);

	return { route, setRoute };
}
