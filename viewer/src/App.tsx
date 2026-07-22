import { useCallback, useEffect, useRef, useState } from "react";
import CommitDetail, { type CommitDetailHandle } from "./CommitDetail";
import ExplanationCard from "./ExplanationCard";
import Sidebar from "./Sidebar";
import {
	fetchChapters,
	fetchCommit,
	fetchDatasets,
	fetchIndex,
	fetchRepo,
} from "./data";
import type { Chapter, Commit, DatasetEntry, IndexEntry, Repo } from "./types";
import { loadLastSha, saveLastSha, useReadState } from "./useReadState";

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
	const [datasets, setDatasets] = useState<DatasetEntry[] | null>(null);
	const [datasetId, setDatasetId] = useState<string | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	// 選択中データセットのメタ
	const [repo, setRepo] = useState<Repo | null>(null);
	const [entries, setEntries] = useState<IndexEntry[]>([]);
	const [chapters, setChapters] = useState<Chapter[] | null>(null);

	// 選択中コミット
	const [activeSeq, setActiveSeq] = useState<number | null>(null);
	const [commit, setCommit] = useState<Commit | null>(null);
	const [commitLoading, setCommitLoading] = useState(false);

	const detailRef = useRef<CommitDetailHandle | null>(null);

	const { isRead, markRead, toggleRead } = useReadState(
		datasetId ?? "__none__",
	);

	// 1. datasets.json 読み込み
	useEffect(() => {
		fetchDatasets()
			.then((ds) => {
				setDatasets(ds);
				if (ds.length > 0) setDatasetId(ds[0].id);
				else
					setLoadError(
						"データセットがありません。generator を実行するか make-fixture.mjs を走らせてください。",
					);
			})
			.catch(() => setLoadError("/data/datasets.json を読めませんでした。"));
	}, []);

	// 2. データセット切替時に repo/index/chapters を読み込む
	useEffect(() => {
		if (!datasetId) return;
		setLoadError(null);
		setCommit(null);
		setActiveSeq(null);
		Promise.all([
			fetchRepo(datasetId),
			fetchIndex(datasetId),
			fetchChapters(datasetId),
		])
			.then(([r, idx, ch]) => {
				setRepo(r);
				setEntries(idx.entries);
				setChapters(ch ? ch.chapters : null);
				// 再開位置: lastSha があればそれ、無ければ先頭
				const last = loadLastSha(datasetId);
				const resume =
					(last && idx.entries.find((e) => e.sha === last)) ??
					idx.entries[0] ??
					null;
				if (resume) setActiveSeq(resume.seq);
			})
			.catch(() =>
				setLoadError(`${datasetId}/index.json を読めませんでした。`),
			);
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

	const selectEntry = useCallback(
		(entry: IndexEntry) => setActiveSeq(entry.seq),
		[],
	);

	// j/k で前後のコミットへ
	const move = useCallback(
		(delta: number) => {
			if (activeSeq == null || entries.length === 0) return;
			const idx = entries.findIndex((e) => e.seq === activeSeq);
			if (idx < 0) return;
			const nextIdx = Math.min(entries.length - 1, Math.max(0, idx + delta));
			setActiveSeq(entries[nextIdx].seq);
		},
		[activeSeq, entries],
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

	return (
		<div className="app">
			<header className="app-header">
				<span className="brand">
					retrace
					<small>コミット履歴の追体験</small>
				</span>

				{datasets && datasets.length > 1 && datasetId && (
					<select
						value={datasetId}
						onChange={(e) => setDatasetId(e.target.value)}
					>
						{datasets.map((d) => (
							<option key={d.id} value={d.id}>
								{d.owner}/{d.repo} ({d.commitCount})
							</option>
						))}
					</select>
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

			<div className="panes">
				<aside className="pane pane-left">
					{entries.length > 0 ? (
						<Sidebar
							entries={entries}
							chapters={chapters}
							activeSha={activeSha}
							isRead={isRead}
							onSelect={selectEntry}
						/>
					) : (
						<div className="pane-status">{loadError ? "" : "読み込み中…"}</div>
					)}
				</aside>

				{commit ? (
					<CommitDetail ref={detailRef} commit={commit} />
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
