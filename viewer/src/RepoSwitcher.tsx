// ヘッダーの現在リポジトリ表示 + クリックで開く検索付き切替メニュー。
// 素の <select> の置き換え。件数が増えても検索で絞れ、各行に進捗を出す。
import { useEffect, useMemo, useRef, useState } from "react";
import { langColor } from "./langColor";
import type { DatasetProgress } from "./useAllProgress";
import type { DatasetEntry } from "./types";

interface Props {
	datasets: DatasetEntry[];
	currentId: string;
	progress: Record<string, DatasetProgress>;
	onSelect: (id: string) => void;
	onBackToPicker: () => void; // 一覧(選択画面)へ戻る
}

export default function RepoSwitcher({
	datasets,
	currentId,
	progress,
	onSelect,
	onBackToPicker,
}: Props) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const rootRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const current = datasets.find((d) => d.id === currentId) ?? null;

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return datasets;
		return datasets.filter(
			(d) =>
				d.repo.toLowerCase().includes(q) ||
				d.owner.toLowerCase().includes(q) ||
				`${d.owner}/${d.repo}`.toLowerCase().includes(q),
		);
	}, [datasets, query]);

	// 外側クリック / Esc で閉じる
	useEffect(() => {
		if (!open) return;
		const onDown = (e: MouseEvent) => {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	// 開いたら検索欄へフォーカス
	useEffect(() => {
		if (open) inputRef.current?.focus();
		else setQuery("");
	}, [open]);

	const choose = (id: string) => {
		setOpen(false);
		if (id !== currentId) onSelect(id);
	};

	return (
		<div className="repo-switcher" ref={rootRef}>
			<button
				type="button"
				className="repo-switcher-trigger"
				onClick={() => setOpen((v) => !v)}
				aria-haspopup="listbox"
				aria-expanded={open}
				title="別のリポジトリに切り替え"
			>
				<span className="repo-switcher-current">
					{current ? `${current.owner}/${current.repo}` : "リポジトリ"}
				</span>
				<span className="repo-switcher-caret" aria-hidden>
					▾
				</span>
			</button>

			{open && (
				<div className="repo-switcher-menu" role="listbox">
					<input
						ref={inputRef}
						className="repo-switcher-search"
						type="search"
						placeholder="絞り込み…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
					<div className="repo-switcher-list">
						{filtered.map((d) => {
							const p = progress[d.id];
							const total = p?.total ?? d.commitCount;
							const pct = p?.pct ?? 0;
							const active = d.id === currentId;
							return (
								<button
									type="button"
									key={d.id}
									role="option"
									aria-selected={active}
									className={`repo-switcher-item${active ? " is-active" : ""}`}
									onClick={() => choose(d.id)}
								>
									<span className="repo-switcher-item-name">
										{d.language && (
											<span
												className="lang-dot"
												style={{ background: langColor(d.language) }}
												title={d.language}
											/>
										)}
										{d.owner}/{d.repo}
									</span>
									<span className="repo-switcher-item-meta">
										{total} · {pct}%
									</span>
								</button>
							);
						})}
						{filtered.length === 0 && (
							<div className="repo-switcher-empty">一致なし</div>
						)}
					</div>
					<button
						type="button"
						className="repo-switcher-back"
						onClick={() => {
							setOpen(false);
							onBackToPicker();
						}}
					>
						← すべてのリポジトリを一覧
					</button>
				</div>
			)}
		</div>
	);
}
