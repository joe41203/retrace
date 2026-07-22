// コミット時点の tree 配列(フラットなパス一覧)を階層ツリーとして描画する。
// 変更ファイルはハイライトし、クリックで diff タブの該当ファイルへスクロールさせる。
import { useMemo } from "react";

interface TreeNode {
	name: string;
	path: string; // フルパス(ファイルのみ意味を持つ)
	children: Map<string, TreeNode>;
	isFile: boolean;
}

function buildTree(paths: string[]): TreeNode {
	const root: TreeNode = {
		name: "",
		path: "",
		children: new Map(),
		isFile: false,
	};
	for (const p of paths) {
		const parts = p.split("/");
		let node = root;
		parts.forEach((part, i) => {
			const isLast = i === parts.length - 1;
			let child = node.children.get(part);
			if (!child) {
				child = {
					name: part,
					path: parts.slice(0, i + 1).join("/"),
					children: new Map(),
					isFile: isLast,
				};
				node.children.set(part, child);
			}
			node = child;
		});
	}
	return root;
}

function sortedChildren(node: TreeNode): TreeNode[] {
	// ディレクトリを先、その後ファイル。各グループ内は名前順。
	return [...node.children.values()].sort((a, b) => {
		if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
		return a.name.localeCompare(b.name);
	});
}

interface FileTreeProps {
	tree: string[];
	changedPaths: Set<string>;
	onSelectFile: (path: string) => void;
}

function TreeRows({
	node,
	depth,
	changedPaths,
	onSelectFile,
}: {
	node: TreeNode;
	depth: number;
	changedPaths: Set<string>;
	onSelectFile: (path: string) => void;
}) {
	return (
		<>
			{sortedChildren(node).map((child) => {
				const indent = { paddingLeft: `${depth * 16 + 6}px` };
				if (child.isFile) {
					const changed = changedPaths.has(child.path);
					return (
						<div
							key={child.path}
							className={`tree-node file${changed ? " changed" : ""}`}
							style={indent}
							onClick={changed ? () => onSelectFile(child.path) : undefined}
							role={changed ? "button" : undefined}
							tabIndex={changed ? 0 : undefined}
							onKeyDown={
								changed
									? (e) => {
											if (e.key === "Enter") onSelectFile(child.path);
										}
									: undefined
							}
							title={
								changed
									? "このコミットで変更されたファイル(クリックで差分へ)"
									: undefined
							}
						>
							<span>📄 {child.name}</span>
							{changed && <span className="tree-changed-badge">変更</span>}
						</div>
					);
				}
				return (
					<div key={child.path}>
						<div className="tree-node dir" style={indent}>
							<span>📁 {child.name}/</span>
						</div>
						<TreeRows
							node={child}
							depth={depth + 1}
							changedPaths={changedPaths}
							onSelectFile={onSelectFile}
						/>
					</div>
				);
			})}
		</>
	);
}

export default function FileTree({
	tree,
	changedPaths,
	onSelectFile,
}: FileTreeProps) {
	const root = useMemo(() => buildTree(tree), [tree]);
	if (tree.length === 0) {
		return (
			<div className="file-note">
				このコミット時点のツリー情報がありません。
			</div>
		);
	}
	return (
		<div className="tree">
			<TreeRows
				node={root}
				depth={0}
				changedPaths={changedPaths}
				onSelectFile={onSelectFile}
			/>
		</div>
	);
}
