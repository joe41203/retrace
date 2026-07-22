// 左ペイン: 上下2段の常時表示(タブではない)。
// - 上段 コミットログ: 章アコーディオン + コミット一覧(chapters が無ければ「全コミット」1グループ)
// - 下段 ファイルツリー: 選択中コミット時点の全ツリー。変更ファイルをクリックで中央 diff へスクロール
// - 上下段の高さ比率はドラッグで可変(localStorage 保存)
import { useCallback, useMemo, useRef, useState } from "react";
import FileTree from "./FileTree";
import ResizeHandle from "./ResizeHandle";
import type { Chapter, Commit, IndexEntry } from "./types";
import { usePersistedNumber } from "./useUiSettings";

// 上段が占める高さの割合(0〜1)。最小段高さを確保するため両端を clamp する。
const SPLIT_MIN = 0.2;
const SPLIT_MAX = 0.85;
const clampSplit = (n: number) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, n));

interface Group {
	key: string;
	title: string;
	summary: string | null;
	entries: IndexEntry[];
}

function buildGroups(
	entries: IndexEntry[],
	chapters: Chapter[] | null,
): Group[] {
	if (!chapters || chapters.length === 0) {
		return [{ key: "all", title: "全コミット", summary: null, entries }];
	}
	const bySeq = new Map(entries.map((e) => [e.seq, e]));
	const groups: Group[] = [];
	const claimed = new Set<number>();
	for (const ch of chapters) {
		const chapterEntries: IndexEntry[] = [];
		for (let s = ch.startSeq; s <= ch.endSeq; s++) {
			const e = bySeq.get(s);
			if (e) {
				chapterEntries.push(e);
				claimed.add(s);
			}
		}
		groups.push({
			key: `ch-${ch.id}`,
			title: ch.title,
			summary: ch.summary,
			entries: chapterEntries,
		});
	}
	// どの章にも属さないコミットは末尾にまとめる(章の範囲が全体を覆わない場合の保険)
	const orphans = entries.filter((e) => !claimed.has(e.seq));
	if (orphans.length > 0) {
		groups.push({
			key: "unchaptered",
			title: "その他",
			summary: null,
			entries: orphans,
		});
	}
	return groups;
}

interface CommitLogProps {
	entries: IndexEntry[];
	chapters: Chapter[] | null;
	activeSha: string | null;
	isRead: (sha: string) => boolean;
	onSelect: (entry: IndexEntry) => void;
}

function CommitLog({
	entries,
	chapters,
	activeSha,
	isRead,
	onSelect,
}: CommitLogProps) {
	const groups = useMemo(
		() => buildGroups(entries, chapters),
		[entries, chapters],
	);
	// どの章にアクティブコミットが含まれるかを初期展開に使う
	const [openKeys, setOpenKeys] = useState<Set<string>>(() => {
		const s = new Set<string>();
		for (const g of groups) {
			if (activeSha && g.entries.some((e) => e.sha === activeSha)) s.add(g.key);
		}
		// 何も選ばれていなければ最初の章を開く
		if (s.size === 0 && groups.length > 0) s.add(groups[0].key);
		return s;
	});

	const toggle = (key: string) =>
		setOpenKeys((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});

	return (
		<div>
			{groups.map((g) => {
				const readCount = g.entries.filter((e) => isRead(e.sha)).length;
				const pct = g.entries.length
					? Math.round((readCount / g.entries.length) * 100)
					: 0;
				const open = openKeys.has(g.key);
				return (
					<div className="chapter" key={g.key}>
						<button className="chapter-header" onClick={() => toggle(g.key)}>
							<span className="chapter-caret">{open ? "▼" : "▶"}</span>
							<span className="chapter-title">{g.title}</span>
							<span className="chapter-count">
								{readCount}/{g.entries.length}
							</span>
						</button>
						<div className="chapter-progress">
							<div className="progress-fill" style={{ width: `${pct}%` }} />
						</div>
						{open && g.summary && (
							<div className="chapter-summary">{g.summary}</div>
						)}
						{open && (
							<ul className="commit-list">
								{g.entries.map((e) => {
									const read = isRead(e.sha);
									return (
										<li key={e.sha}>
											<button
												className={`commit-item${e.sha === activeSha ? " active" : ""}`}
												onClick={() => onSelect(e)}
											>
												<span
													className={`commit-read-mark${read ? "" : " unread"}`}
													title={read ? "既読" : "未読"}
												>
													{read ? "✔" : "○"}
												</span>
												<span className="commit-body">
													<span className="commit-subject">{e.subject}</span>
													<span className="commit-meta-row">
														<span className="commit-seq">#{e.seq}</span>
														<span>{e.authorName}</span>
														{e.prNumber != null && (
															<span className="pr-tag">PR #{e.prNumber}</span>
														)}
													</span>
												</span>
											</button>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				);
			})}
		</div>
	);
}

interface SidebarProps {
	entries: IndexEntry[];
	chapters: Chapter[] | null;
	activeSha: string | null;
	commit: Commit | null;
	isRead: (sha: string) => boolean;
	onSelect: (entry: IndexEntry) => void;
	onSelectFile: (path: string) => void;
}

export default function Sidebar({
	entries,
	chapters,
	activeSha,
	commit,
	isRead,
	onSelect,
	onSelectFile,
}: SidebarProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [split, setSplit] = usePersistedNumber(
		"retrace:ui:sidebarSplit",
		0.55,
		clampSplit,
	);

	const changedPaths = useMemo(
		() => new Set((commit?.files ?? []).map((f) => f.path)),
		[commit],
	);

	// 横ハンドルのドラッグ: コンテナ矩形に対するポインタ Y から上段比率を求める。
	const onSplitDrag = useCallback(
		(_clientX: number, clientY: number) => {
			const el = containerRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			if (rect.height <= 0) return;
			setSplit((clientY - rect.top) / rect.height);
		},
		[setSplit],
	);

	return (
		<div className="sidebar-stack" ref={containerRef}>
			<section
				className="sidebar-section"
				style={{ flexBasis: `${split * 100}%` }}
			>
				<div className="sidebar-section-title">コミットログ</div>
				<div className="sidebar-section-body">
					<CommitLog
						entries={entries}
						chapters={chapters}
						activeSha={activeSha}
						isRead={isRead}
						onSelect={onSelect}
					/>
				</div>
			</section>

			<ResizeHandle
				orientation="horizontal"
				onResize={onSplitDrag}
				ariaLabel="上段と下段の高さ比率を変更"
			/>

			<section className="sidebar-section sidebar-section-grow">
				<div className="sidebar-section-title">ファイルツリー</div>
				<div className="sidebar-section-body">
					{commit ? (
						<div className="left-tree-wrap">
							<FileTree
								tree={commit.tree}
								changedPaths={changedPaths}
								onSelectFile={onSelectFile}
							/>
						</div>
					) : (
						<div className="left-tree-hint">
							コミットを選択するとツリーを表示します。
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
