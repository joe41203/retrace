// 解説カード内の Mermaid ダイアグラムを描画する。
// - mermaid は動的 import で遅延ロード(初回描画時のみバンドルを取得)
// - prefers-color-scheme に追従してテーマを切替
// - 描画失敗時はエラーで画面を壊さず、mermaid ソースをコードブロックとして表示
import { useEffect, useRef, useState } from "react";
import type { Diagram as DiagramData } from "./types";

function prefersDark(): boolean {
	return (
		typeof window !== "undefined" &&
		window.matchMedia?.("(prefers-color-scheme: dark)").matches
	);
}

// mermaid モジュールはテーマ切替のたびに initialize が必要なので毎回取得(内部でキャッシュされる)。
async function renderMermaid(
	code: string,
	dark: boolean,
	id: string,
): Promise<string> {
	const mermaid = (await import("mermaid")).default;
	mermaid.initialize({
		startOnLoad: false,
		theme: dark ? "dark" : "default",
		securityLevel: "strict",
		fontFamily: "inherit",
	});
	const { svg } = await mermaid.render(id, code);
	return svg;
}

let diagramSeq = 0;

export default function Diagram({ diagram }: { diagram: DiagramData }) {
	const [svg, setSvg] = useState<string | null>(null);
	const [failed, setFailed] = useState(false);
	const idRef = useRef(`mermaid-${(diagramSeq += 1)}`);

	useEffect(() => {
		let cancelled = false;

		const render = () => {
			setFailed(false);
			setSvg(null);
			renderMermaid(diagram.mermaid, prefersDark(), idRef.current)
				.then((out) => {
					if (!cancelled) setSvg(out);
				})
				.catch(() => {
					if (!cancelled) setFailed(true);
				});
		};

		render();

		// テーマ変更に追従して再描画
		const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
		const onChange = () => render();
		mq?.addEventListener?.("change", onChange);

		return () => {
			cancelled = true;
			mq?.removeEventListener?.("change", onChange);
		};
	}, [diagram.mermaid]);

	return (
		<div className="diagram-card">
			{failed ? (
				<pre className="diagram-fallback">{diagram.mermaid}</pre>
			) : svg ? (
				// mermaid が生成する SVG。securityLevel: 'strict' でサニタイズ済み。
				<div
					className="diagram-render"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: mermaid strict モードのサニタイズ済み SVG を描画するため
					dangerouslySetInnerHTML={{ __html: svg }}
				/>
			) : (
				<div className="diagram-render">図を描画中…</div>
			)}
			{diagram.caption && (
				<div className="diagram-caption">{diagram.caption}</div>
			)}
		</div>
	);
}
