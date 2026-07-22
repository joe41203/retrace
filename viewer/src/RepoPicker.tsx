// 起動時のリポジトリ選択画面。全データセットをカードグリッドで見せ、
// クリックで読み始める入口。各カードに owner/repo・コミット数・進捗を出す。
import { useMemo, useState } from "react";
import { langColor } from "./langColor";
import type { DatasetProgress } from "./useAllProgress";
import type { DatasetEntry } from "./types";

interface Props {
	datasets: DatasetEntry[];
	progress: Record<string, DatasetProgress>;
	lastDatasetId: string | null; // 前回開いていたもの(「続きから」に使う)
	onSelect: (id: string) => void;
}

export default function RepoPicker({
	datasets,
	progress,
	lastDatasetId,
	onSelect,
}: Props) {
	const [query, setQuery] = useState("");

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

	const last = lastDatasetId
		? (datasets.find((d) => d.id === lastDatasetId) ?? null)
		: null;

	return (
		<div className="picker">
			<div className="picker-inner">
				<div className="picker-head">
					<h1 className="picker-title">Retrace</h1>
					<p className="picker-lead">読むリポジトリを選んでください。</p>
				</div>

				{last && (
					<button
						type="button"
						className="picker-resume"
						onClick={() => onSelect(last.id)}
					>
						<span className="picker-resume-label">前回の続きから</span>
						<span className="picker-resume-repo">
							{last.owner}/{last.repo}
						</span>
						{progress[last.id] && (
							<span className="picker-resume-pct">
								{progress[last.id].read}/{progress[last.id].total} 読了 ·{" "}
								{progress[last.id].pct}%
							</span>
						)}
					</button>
				)}

				{datasets.length > 6 && (
					<input
						className="picker-search"
						type="search"
						placeholder="リポジトリ名で絞り込み…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						// biome-ignore lint/a11y/noAutofocus: 選択画面の主目的が検索なので許容
						autoFocus
					/>
				)}

				<div className="picker-grid">
					{filtered.map((d) => {
						const p = progress[d.id];
						const total = p?.total ?? d.commitCount;
						const read = p?.read ?? 0;
						const pct = p?.pct ?? 0;
						const done = total > 0 && read >= total;
						return (
							<button
								type="button"
								key={d.id}
								className={`repo-card${done ? " is-done" : ""}`}
								onClick={() => onSelect(d.id)}
							>
								<div className="repo-card-owner">{d.owner}</div>
								<div className="repo-card-name">{d.repo}</div>
								<div className="repo-card-meta">
									{d.language && (
										<span className="lang-badge">
											<span
												className="lang-dot"
												style={{ background: langColor(d.language) }}
											/>
											{d.language}
										</span>
									)}
									<span>{total} コミット</span>
								</div>
								<div className="repo-card-progress">
									<div className="progress-track">
										<div
											className="progress-fill"
											style={{ width: `${pct}%` }}
										/>
									</div>
									<span className="repo-card-pct">
										{done ? "読了 ✔" : `${read}/${total} · ${pct}%`}
									</span>
								</div>
							</button>
						);
					})}
				</div>

				{filtered.length === 0 && (
					<div className="picker-empty">
						「{query}」に一致するリポジトリはありません。
					</div>
				)}

				<div className="picker-footer">
					<span className="picker-footer-label">紹介ページ:</span>
					{/* LP は静的 HTML(public/lp/*)。SPA ルート外なので通常リンクで遷移。 */}
					<a href="/lp/a/">Terminal 版</a>
					<span className="picker-footer-sep">·</span>
					<a href="/lp/b/">Editorial 版</a>
				</div>
			</div>
		</div>
	);
}
