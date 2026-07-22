// 中央ペイン: コミットメタ + diff/ファイルツリーのタブ切替。
import {
	forwardRef,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import type { ViewType } from "react-diff-view";
import DiffView, { type DiffViewHandle } from "./DiffView";
import FileTree from "./FileTree";
import type { Commit } from "./types";

type Tab = "diff" | "tree";

// 右ペインの読みどころクリックなどから、diff タブへ切り替えて該当ファイルへ
// スクロールさせるために公開するハンドル。
export interface CommitDetailHandle {
	scrollToFileInDiff: (path: string) => void;
}

interface CommitDetailProps {
	commit: Commit;
}

const CommitDetail = forwardRef<CommitDetailHandle, CommitDetailProps>(
	function CommitDetail({ commit }, ref) {
		const [tab, setTab] = useState<Tab>("diff");
		const [viewType, setViewType] = useState<ViewType>("unified");
		const diffRef = useRef<DiffViewHandle | null>(null);

		const changedPaths = useMemo(
			() => new Set(commit.files.map((f) => f.path)),
			[commit.files],
		);

		const scrollToFileInDiff = (path: string) => {
			setTab("diff");
			// diff タブへ切り替わってから DOM が整うのを待ってスクロール
			window.setTimeout(() => diffRef.current?.scrollToFile(path), 60);
		};

		useImperativeHandle(ref, () => ({ scrollToFileInDiff }));

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
					<button
						className={`tab-btn${tab === "diff" ? " active" : ""}`}
						onClick={() => setTab("diff")}
					>
						diff
					</button>
					<button
						className={`tab-btn${tab === "tree" ? " active" : ""}`}
						onClick={() => setTab("tree")}
					>
						ファイルツリー
					</button>
					<span className="spacer" />
					{tab === "diff" && (
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
					)}
				</div>

				<div className="center-scroll">
					{tab === "diff" ? (
						<>
							{commit.diffTruncated && (
								<div className="banner banner-warn">
									この差分は大きいため一部が省略されています(diffTruncated)。全体は元リポジトリで確認してください。
								</div>
							)}
							<DiffView ref={diffRef} commit={commit} viewType={viewType} />
						</>
					) : (
						<FileTree
							tree={commit.tree}
							changedPaths={changedPaths}
							onSelectFile={scrollToFileInDiff}
						/>
					)}
				</div>
			</div>
		);
	},
);

export default CommitDetail;
