// 右ペインの解説カード。explanation が null なら未生成プレースホルダを出す。
import type { Evidence, Explanation } from "./types";

const EVIDENCE_LABEL: Record<Evidence, string> = {
	pr: "PR根拠",
	issue: "issue根拠",
	message: "メッセージ根拠",
	inferred: "推測",
};

function EvidenceBadge({ evidence }: { evidence: Evidence }) {
	return (
		<span className={`evidence-badge evidence-${evidence}`}>
			{EVIDENCE_LABEL[evidence]}
		</span>
	);
}

export default function ExplanationCard({
	explanation,
	onSelectFile,
}: {
	explanation: Explanation | null;
	onSelectFile: (path: string) => void;
}) {
	if (!explanation) {
		return (
			<div className="empty-explanation">
				<p>解説未生成</p>
				<p>
					<code>/retrace-generate</code> を実行してください。
				</p>
			</div>
		);
	}

	return (
		<div className="explanation">
			<div className="exp-section">
				<EvidenceBadge evidence={explanation.evidence} />
			</div>

			<div className="exp-section">
				<h3>何を</h3>
				<p>{explanation.what}</p>
			</div>

			<div className="exp-section">
				<h3>なぜ</h3>
				<p>{explanation.why}</p>
			</div>

			{explanation.highlights.length > 0 && (
				<div className="exp-section">
					<h3>読みどころ</h3>
					<ul className="highlight-list">
						{explanation.highlights.map((h, i) => (
							<li key={`${h.file}-${i}`}>
								<span
									className="highlight-file"
									onClick={() => onSelectFile(h.file)}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === "Enter") onSelectFile(h.file);
									}}
									title="差分へスクロール"
								>
									{h.file}
								</span>
								<span>{h.note}</span>
							</li>
						))}
					</ul>
				</div>
			)}

			{explanation.refs.length > 0 && (
				<div className="exp-section">
					<h3>根拠リンク</h3>
					<ul className="refs-list">
						{explanation.refs.map((r, i) => (
							<li key={`${r.type}-${r.number}-${i}`}>
								<a
									className="ref-chip"
									href={r.url}
									target="_blank"
									rel="noopener noreferrer"
								>
									{r.type} #{r.number}
								</a>
							</li>
						))}
					</ul>
				</div>
			)}

			<div className="exp-meta">
				{explanation.model} ·{" "}
				{new Date(explanation.generatedAt).toLocaleString("ja-JP")}
			</div>
		</div>
	);
}
