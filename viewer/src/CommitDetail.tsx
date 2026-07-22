// 中央ペイン: コミットメタ + diff 専用ビュー(unified/split 切替)。
// ファイルツリーは左サイドバーへ移動したためここには無い。
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { ViewType } from "react-diff-view";
import DiffView, { type DiffViewHandle } from "./DiffView";
import type { Commit } from "./types";

// 左のファイルツリーや右の読みどころクリックから、該当ファイルの diff へ
// スクロールさせるために公開するハンドル。
export interface CommitDetailHandle {
	scrollToFileInDiff: (path: string) => void;
}

interface CommitDetailProps {
	commit: Commit;
}

const CommitDetail = forwardRef<CommitDetailHandle, CommitDetailProps>(
	function CommitDetail({ commit }, ref) {
		const [viewType, setViewType] = useState<ViewType>("unified");
		const diffRef = useRef<DiffViewHandle | null>(null);

		useImperativeHandle(ref, () => ({
			scrollToFileInDiff: (path: string) => {
				diffRef.current?.scrollToFile(path);
			},
		}));

		const date = new Date(commit.author.date).toLocaleString("ja-JP");

		return (
			<div className="pane pane-center">
				<div className="commit-header">
					<h2>{commit.message.split("\n")[0]}</h2>
					<div className="sub">
						<span>#{commit.seq}</span>
						<span className="sha">{commit.sha.slice(0, 7)}</span>
						<span>{commit.author.name}</span>
						<span>{date}</span>
						{commit.pr && (
							<a href={commit.pr.url} target="_blank" rel="noopener noreferrer">
								PR #{commit.pr.number}
							</a>
						)}
						{commit.linkedIssues.map((iss) => (
							<a
								key={iss.number}
								href={iss.url}
								target="_blank"
								rel="noopener noreferrer"
							>
								issue #{iss.number}
							</a>
						))}
						<span>
							{commit.stats.filesChanged} files{" "}
							<span style={{ color: "var(--success)" }}>
								+{commit.stats.additions}
							</span>{" "}
							<span style={{ color: "var(--danger)" }}>
								-{commit.stats.deletions}
							</span>
						</span>
					</div>
					{commit.message.includes("\n") && (
						<div className="commit-message-full">{commit.message}</div>
					)}
				</div>

				<div className="tabs">
					<span className="diff-label">diff</span>
					<span className="spacer" />
					<div className="view-toggle">
						<button
							className={viewType === "unified" ? "active" : ""}
							onClick={() => setViewType("unified")}
						>
							unified
						</button>
						<button
							className={viewType === "split" ? "active" : ""}
							onClick={() => setViewType("split")}
						>
							split
						</button>
					</div>
				</div>

				<div className="center-scroll">
					{commit.diffTruncated && (
						<div className="banner banner-warn">
							この差分は大きいため一部が省略されています(diffTruncated)。全体は元リポジトリで確認してください。
						</div>
					)}
					<DiffView ref={diffRef} commit={commit} viewType={viewType} />
				</div>
			</div>
		);
	},
);

export default CommitDetail;
