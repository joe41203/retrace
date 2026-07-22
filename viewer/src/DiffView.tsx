// コミットの diff を react-diff-view で描画する。
// - ファイルごとに折りたたみ可能
// - 巨大ファイル(500行超)はデフォルト折りたたみ
// - binary は差分表示できないので注記
// - ファイルパスから該当カードへスクロールできるよう ref を公開する
import {
	Diff,
	Hunk,
	parseDiff,
	type FileData,
	type ViewType,
} from "react-diff-view";
import {
	forwardRef,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Commit, CommitFile } from "./types";

const BIG_FILE_LINES = 500;

// parseDiff が返す FileData から、ビューア上のファイルパスを決める。
// 追加は newPath、削除は oldPath、その他は new を優先。
function pathOf(file: FileData): string {
	return file.newPath && file.newPath !== "/dev/null"
		? file.newPath
		: file.oldPath && file.oldPath !== "/dev/null"
			? file.oldPath
			: (file.newPath ?? file.oldPath ?? "");
}

function changeCount(file: FileData): number {
	return file.hunks.reduce((sum, h) => sum + h.changes.length, 0);
}

interface DiffFileCardProps {
	file: FileData;
	meta: CommitFile | undefined;
	viewType: ViewType;
	defaultCollapsed: boolean;
	registerRef: (path: string, el: HTMLDivElement | null) => void;
}

function DiffFileCard({
	file,
	meta,
	viewType,
	defaultCollapsed,
	registerRef,
}: DiffFileCardProps) {
	const [collapsed, setCollapsed] = useState(defaultCollapsed);
	const path = pathOf(file);

	return (
		<div
			className="file-card"
			ref={(el) => registerRef(path, el)}
			data-path={path}
		>
			<div
				className={`file-card-header${collapsed ? " collapsed" : ""}`}
				onClick={() => setCollapsed((c) => !c)}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						setCollapsed((c) => !c);
					}
				}}
			>
				<span className="file-card-caret">{collapsed ? "▶" : "▼"}</span>
				<span className="status-badge">
					{meta?.status ?? file.type[0]?.toUpperCase()}
				</span>
				<span className="file-path">{path}</span>
				{meta && (
					<span className="file-stat">
						<span className="add">+{meta.additions}</span>{" "}
						<span className="del">-{meta.deletions}</span>
					</span>
				)}
			</div>
			{!collapsed &&
				(meta?.binary ? (
					<div className="file-note">バイナリファイル(差分表示なし)</div>
				) : (
					<div className="diff-scroll">
						<Diff
							viewType={viewType}
							diffType={file.type}
							hunks={file.hunks}
							optimizeSelection
						>
							{(hunks) =>
								hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)
							}
						</Diff>
					</div>
				))}
		</div>
	);
}

export interface DiffViewHandle {
	scrollToFile: (path: string) => void;
}

interface DiffViewProps {
	commit: Commit;
	viewType: ViewType;
}

const DiffView = forwardRef<DiffViewHandle, DiffViewProps>(function DiffView(
	{ commit, viewType },
	ref,
) {
	const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	const files = useMemo(() => {
		if (!commit.diff) return [] as FileData[];
		try {
			return parseDiff(commit.diff);
		} catch {
			return [] as FileData[];
		}
	}, [commit.diff]);

	// path -> CommitFile メタ(status/additions/binary)を引くためのマップ
	const metaByPath = useMemo(() => {
		const m = new Map<string, CommitFile>();
		for (const f of commit.files) m.set(f.path, f);
		return m;
	}, [commit.files]);

	const registerRef = (path: string, el: HTMLDivElement | null) => {
		if (el) cardRefs.current.set(path, el);
		else cardRefs.current.delete(path);
	};

	useImperativeHandle(ref, () => ({
		scrollToFile: (path: string) => {
			const el = cardRefs.current.get(path);
			if (el) {
				el.scrollIntoView({ behavior: "smooth", block: "start" });
				el.classList.add("highlighted");
				window.setTimeout(() => el.classList.remove("highlighted"), 1500);
			}
		},
	}));

	if (files.length === 0) {
		// diff がパースできない/空のとき(binary のみのコミット等)は files メタから列挙する
		if (commit.files.length === 0) {
			return <div className="file-note">差分はありません。</div>;
		}
		return (
			<>
				{commit.files.map((f) => (
					<div
						key={f.path}
						className="file-card"
						ref={(el) => registerRef(f.path, el)}
					>
						<div className="file-card-header collapsed">
							<span className="file-card-caret" />
							<span className="status-badge">{f.status}</span>
							<span className="file-path">{f.path}</span>
						</div>
						<div className="file-note">
							{f.binary
								? "バイナリファイル(差分表示なし)"
								: "差分は表示できません。"}
						</div>
					</div>
				))}
			</>
		);
	}

	return (
		<>
			{files.map((file) => {
				const path = pathOf(file);
				const meta = metaByPath.get(path);
				const big = changeCount(file) > BIG_FILE_LINES;
				return (
					<DiffFileCard
						key={path}
						file={file}
						meta={meta}
						viewType={viewType}
						defaultCollapsed={big}
						registerRef={registerRef}
					/>
				);
			})}
		</>
	);
});

export default DiffView;
