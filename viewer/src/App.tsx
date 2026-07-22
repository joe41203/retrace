import { useCallback, useEffect, useRef, useState } from "react";
import CommitDetail, { type CommitDetailHandle } from "./CommitDetail";
import ExplanationCard from "./ExplanationCard";
import RepoPicker from "./RepoPicker";
import RepoSwitcher from "./RepoSwitcher";
import ResizeHandle from "./ResizeHandle";
import Sidebar from "./Sidebar";
import {
	fetchChapters,
	fetchCommit,
	fetchDatasets,
	fetchIndex,
	fetchRepo,
} from "./data";
import type { Chapter, Commit, DatasetEntry, IndexEntry, Repo } from "./types";
import { useAllProgress } from "./useAllProgress";
import { useHashRoute } from "./useHashRoute";
import { loadLastSha, saveLastSha, useReadState } from "./useReadState";
import { usePersistedNumber } from "./useUiSettings";

// 最後に開いたデータセット id。選択画面の「続きから」表示に使う。
const LAST_DATASET_KEY = "retrace:ui:lastDataset";
function loadLastDataset(): string | null {
	try {
		return localStorage.getItem(LAST_DATASET_KEY);
	} catch {
		return null;
	}
}
function saveLastDataset(id: string): void {
	try {
		localStorage.setItem(LAST_DATASET_KEY, id);
	} catch {
		// 保存不可でも致命的ではない
	}
}

// 左カラム幅(px)。最小 200px、最大 640px でレイアウト崩壊を防ぐ。
const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 640;
const clampSidebar = (n: number) =>
	Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, n));

// 入力欄にフォーカスがあるときはキーボードショートカットを無効化する
function isTypingTarget(el: EventTarget | null): boolean {
	if (!(el instanceof HTMLElement)) return false;
	const tag = el.tagName;
	return (
		tag === "INPUT" ||
		tag === "TEXTAREA" ||
		tag === "SELECT" ||
		el.isContentEditable
	);
}

export default function App() {
	// URL ハッシュ(#/<datasetId>/<seq>)を唯一の真実源にする。
	// datasetId / activeSeq は route から導出し、独立 state では持たない。
	// これで reload/戻る進むと画面状態が常に一致し、同期 effect の競合も起きない。
	const { route, setRoute } = useHashRoute();

	const [datasets, setDatasets] = useState<DatasetEntry[] | null>(null);
	const [lastDatasetId, setLastDatasetId] = useState<string | null>(() =>
		loadLastDataset(),
	);
	const [loadError, setLoadError] = useState<string | null>(null);

	// 選択中データセットのメタ
	const [repo, setRepo] = useState<Repo | null>(null);
	const [entries, setEntries] = useState<IndexEntry[]>([]);
	const [chapters, setChapters] = useState<Chapter[] | null>(null);

	// 選択中コミット
	const [commit, setCommit] = useState<Commit | null>(null);
	const [commitLoading, setCommitLoading] = useState(false);

	// route から導出。datasets 読み込み前は route の値をそのまま尊重する
	// (無効な id は datasets 読み込み後に補正)。
	const datasetId =
		route.datasetId &&
		(!datasets || datasets.some((d) => d.id === route.datasetId))
			? route.datasetId
			: null;
	// activeSeq は「読み込んだ entries に実在する seq」のみ有効
	const activeSeq =
		route.seq != null && entries.some((e) => e.seq === route.seq)
			? route.seq
			: null;

	const detailRef = useRef<CommitDetailHandle | null>(null);
	const panesRef = useRef<HTMLDivElement>(null);

	const [sidebarWidth, setSidebarWidth] = usePersistedNumber(
		"retrace:ui:sidebarWidth",
		320,
		clampSidebar,
	);

	// 縦ハンドルのドラッグ: panes 左端からのポインタ X を左カラム幅にする。
	const onSidebarDrag = useCallback(
		(clientX: number) => {
			const el = panesRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			setSidebarWidth(clientX - rect.left);
		},
		[setSidebarWidth],
	);

	const { isRead, markRead, toggleRead } = useReadState(
		datasetId ?? "__none__",
	);

	// 1. datasets.json 読み込み。
	useEffect(() => {
		fetchDatasets()
			.then((ds) => {
				setDatasets(ds);
				if (ds.length === 0) {
					setLoadError(
						"データセットがありません。generator を実行するか make-fixture.mjs を走らせてください。",
					);
					return;
				}
				// ハッシュに有効な id が無く 1 件だけなら即開く(選ぶ手間を省く)。
				const hasValidHash =
					route.datasetId && ds.some((d) => d.id === route.datasetId);
				if (!hasValidHash && ds.length === 1) {
					setRoute(ds[0].id, null, true);
				} else if (route.datasetId && !hasValidHash) {
					// 無効な id を指すハッシュは選択画面へ落とす
					setRoute(null, null, true);
				}
			})
			.catch(() => setLoadError("/data/datasets.json を読めませんでした。"));
		// 初回マウント時のハッシュだけ見ればよい
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// 2. データセット(route.datasetId)変化時に repo/index/chapters を読み込む。
	//    lastDatasetId の記録もここで行う。
	useEffect(() => {
		if (!datasetId) {
			setRepo(null);
			setEntries([]);
			setChapters(null);
			return;
		}
		setLoadError(null);
		setCommit(null);
		setLastDatasetId(datasetId);
		saveLastDataset(datasetId);
		let cancelled = false;
		Promise.all([
			fetchRepo(datasetId),
			fetchIndex(datasetId),
			fetchChapters(datasetId),
		])
			.then(([r, idx, ch]) => {
				if (cancelled) return;
				setRepo(r);
				setEntries(idx.entries);
				setChapters(ch ? ch.chapters : null);
				// seq がハッシュに無い / 実在しないなら再開位置を決めてハッシュに埋める。
				//   優先順: 1. lastSha(localStorage) / 2. 先頭
				const hashSeqValid =
					route.seq != null && idx.entries.some((e) => e.seq === route.seq);
				if (!hashSeqValid) {
					const last = loadLastSha(datasetId);
					const resume =
						(last && idx.entries.find((e) => e.sha === last)) ??
						idx.entries[0] ??
						null;
					if (resume) setRoute(datasetId, resume.seq, true);
				}
			})
			.catch(() => {
				if (!cancelled)
					setLoadError(`${datasetId}/index.json を読めませんでした。`);
			});
		return () => {
			cancelled = true;
		};
		// route.seq は「datasetId が変わった瞬間の値」だけ使えばよい(意図的に除外)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [datasetId]);

	// 3. アクティブ seq のコミット JSON 読み込み + 既読化 + 再開位置保存
	useEffect(() => {
		if (!datasetId || activeSeq == null) return;
		const entry = entries.find((e) => e.seq === activeSeq);
		if (!entry) return;
		let cancelled = false;
		setCommitLoading(true);
		fetchCommit(datasetId, entry.seq, entry.sha)
			.then((c) => {
				if (cancelled) return;
				setCommit(c);
				markRead(c.sha); // 開いたら自動既読
				saveLastSha(datasetId, c.sha);
			})
			.catch(() => {
				if (!cancelled)
					setLoadError(`コミット #${entry.seq} を読めませんでした。`);
			})
			.finally(() => {
				if (!cancelled) setCommitLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [datasetId, activeSeq, entries, markRead]);

	// コミット選択: ハッシュの seq を replace で差し替える(履歴を汚さない)。
	const selectEntry = useCallback(
		(entry: IndexEntry) => setRoute(datasetId, entry.seq, true),
		[datasetId, setRoute],
	);

	// データセットを選ぶ(選択画面 / 切替メニュー共通)。履歴に積む(戻るで前へ)。
	const selectDataset = useCallback(
		(id: string) => setRoute(id, null),
		[setRoute],
	);

	// 選択画面へ戻る。ハッシュを #/ に(履歴に積む)。
	const backToPicker = useCallback(() => setRoute(null, null), [setRoute]);

	// 選択画面 / 切替メニューで見せる各データセットの進捗。
	// datasetId を refreshKey に渡し、選択画面へ戻るたびに読み直す。
	const allProgress = useAllProgress(datasets, datasetId);

	// j/k で前後のコミットへ(ハッシュを replace で差し替え)
	const move = useCallback(
		(delta: number) => {
			if (activeSeq == null || entries.length === 0) return;
			const idx = entries.findIndex((e) => e.seq === activeSeq);
			if (idx < 0) return;
			const nextIdx = Math.min(entries.length - 1, Math.max(0, idx + delta));
			setRoute(datasetId, entries[nextIdx].seq, true);
		},
		[activeSeq, entries, datasetId, setRoute],
	);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (isTypingTarget(e.target)) return;
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			if (e.key === "j") {
				e.preventDefault();
				move(1);
			} else if (e.key === "k") {
				e.preventDefault();
				move(-1);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [move]);

	// 右ペインの読みどころ等からファイルへスクロール。
	// CommitDetail 側で diff タブへ切り替えてから該当ファイルへスクロールする。
	const scrollToFile = useCallback((path: string) => {
		detailRef.current?.scrollToFileInDiff(path);
	}, []);

	const readCount = entries.filter((e) => isRead(e.sha)).length;
	const overallPct = entries.length
		? Math.round((readCount / entries.length) * 100)
		: 0;

	const activeSha =
		commit?.sha ?? entries.find((e) => e.seq === activeSeq)?.sha ?? null;

	// データセット未選択(かつ複数あり)なら選択画面を出す。
	if (!datasetId && datasets && datasets.length > 1) {
		return (
			<RepoPicker
				datasets={datasets}
				progress={allProgress}
				lastDatasetId={lastDatasetId}
				onSelect={selectDataset}
			/>
		);
	}

	// datasets 読み込み前 / 0 件 のプレースホルダ(選択画面にも本編にも遷移できない)
	if (!datasetId) {
		return (
			<div className="app">
				<header className="app-header">
					<span className="brand">Retrace</span>
				</header>
				{loadError ? (
					<div className="error-box">{loadError}</div>
				) : (
					<div className="center-status">読み込み中…</div>
				)}
			</div>
		);
	}

	return (
		<div className="app">
			<header className="app-header">
				<span className="brand">Retrace</span>

				{datasets && datasets.length > 1 && (
					<RepoSwitcher
						datasets={datasets}
						currentId={datasetId}
						progress={allProgress}
						onSelect={selectDataset}
						onBackToPicker={backToPicker}
					/>
				)}

				{repo && (
					<a
						className="repo-link"
						href={repo.url}
						target="_blank"
						rel="noopener noreferrer"
					>
						{repo.owner}/{repo.repo} ↗
					</a>
				)}

				<span className="spacer" />
				<span className="kbd-hint">
					<kbd>j</kbd> 次 / <kbd>k</kbd> 前
				</span>
				<div className="overall-progress">
					<span>
						{readCount}/{entries.length}
					</span>
					<div className="progress-track">
						<div
							className="progress-fill"
							style={{ width: `${overallPct}%` }}
						/>
					</div>
					<span>{overallPct}%</span>
				</div>
			</header>

			{loadError && <div className="error-box">{loadError}</div>}

			<div
				className="panes"
				ref={panesRef}
				style={
					{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties
				}
			>
				<aside className="pane pane-left">
					{entries.length > 0 ? (
						<Sidebar
							entries={entries}
							chapters={chapters}
							activeSha={activeSha}
							commit={commit}
							isRead={isRead}
							onSelect={selectEntry}
							onSelectFile={scrollToFile}
						/>
					) : (
						<div className="pane-status">{loadError ? "" : "読み込み中…"}</div>
					)}
				</aside>

				<ResizeHandle
					orientation="vertical"
					onResize={onSidebarDrag}
					ariaLabel="左カラムの幅を変更"
				/>

				{commit ? (
					<CommitDetail ref={detailRef} commit={commit} repo={repo} />
				) : (
					<div className="pane pane-center">
						<div className="center-status">
							{commitLoading
								? "コミットを読み込み中…"
								: "コミットを選択してください。"}
						</div>
					</div>
				)}

				<aside className="pane pane-right">
					{commit ? (
						<>
							<div style={{ padding: "12px 16px 0" }}>
								<button
									className="icon-btn"
									onClick={() => toggleRead(commit.sha)}
									title="既読/未読を手動で切り替え"
								>
									{isRead(commit.sha)
										? "✔ 既読(クリックで未読に)"
										: "○ 未読(クリックで既読に)"}
								</button>
							</div>
							<ExplanationCard
								explanation={commit.explanation}
								onSelectFile={scrollToFile}
							/>
						</>
					) : (
						<div className="pane-status">—</div>
					)}
				</aside>
			</div>
		</div>
	);
}
