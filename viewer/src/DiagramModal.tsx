// Mermaid ダイアグラムの拡大表示モーダル。
// - 全画面オーバーレイに SVG を大きく表示し、ズーム(ホイール/ボタン)とパン(ドラッグ)ができる
// - ESC / 背景クリック / × ボタンで閉じる
// - 開いている間は body のスクロールを止め、× ボタンへフォーカスを移す(簡易フォーカストラップ)
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 0.5;
const MAX_SCALE = 6;
const ZOOM_STEP = 0.2;

function clampScale(s: number): number {
	return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

export default function DiagramModal({
	svg,
	caption,
	onClose,
}: {
	svg: string;
	caption?: string;
	onClose: () => void;
}) {
	const [scale, setScale] = useState(1);
	// パンのオフセット(px)。ドラッグ量を累積する。
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const dragRef = useRef<{ x: number; y: number } | null>(null);
	const closeBtnRef = useRef<HTMLButtonElement>(null);

	const reset = useCallback(() => {
		setScale(1);
		setOffset({ x: 0, y: 0 });
	}, []);

	// ESC で閉じる & 開いている間は背景スクロールを止める。開いたら × にフォーカス。
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		closeBtnRef.current?.focus();
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prevOverflow;
		};
	}, [onClose]);

	// ホイールでズーム。ページスクロールを奪うので passive:false で登録する。
	const stageRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = stageRef.current;
		if (!el) return;
		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			const dir = e.deltaY < 0 ? 1 : -1;
			setScale((s) => clampScale(s + dir * ZOOM_STEP));
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, []);

	const onPointerDown = (e: React.PointerEvent) => {
		dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
		(e.target as HTMLElement).setPointerCapture?.(e.pointerId);
	};
	const onPointerMove = (e: React.PointerEvent) => {
		if (!dragRef.current) return;
		setOffset({
			x: e.clientX - dragRef.current.x,
			y: e.clientY - dragRef.current.y,
		});
	};
	const onPointerUp = () => {
		dragRef.current = null;
	};

	return (
		<div
			className="diagram-modal-overlay"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label="ダイアグラム拡大表示"
		>
			<div className="diagram-modal" onClick={(e) => e.stopPropagation()}>
				<div className="diagram-modal-toolbar">
					<div className="diagram-modal-zoom">
						<button
							type="button"
							className="icon-btn"
							onClick={() => setScale((s) => clampScale(s - ZOOM_STEP))}
							title="縮小"
							aria-label="縮小"
						>
							−
						</button>
						<span className="diagram-modal-scale">
							{Math.round(scale * 100)}%
						</span>
						<button
							type="button"
							className="icon-btn"
							onClick={() => setScale((s) => clampScale(s + ZOOM_STEP))}
							title="拡大"
							aria-label="拡大"
						>
							＋
						</button>
						<button
							type="button"
							className="icon-btn"
							onClick={reset}
							title="等倍に戻す"
						>
							リセット
						</button>
					</div>
					<button
						ref={closeBtnRef}
						type="button"
						className="icon-btn diagram-modal-close"
						onClick={onClose}
						title="閉じる (Esc)"
						aria-label="閉じる"
					>
						✕
					</button>
				</div>

				<div
					ref={stageRef}
					className="diagram-modal-stage"
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerLeave={onPointerUp}
				>
					<div
						className="diagram-modal-canvas"
						style={{
							transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
						}}
						// biome-ignore lint/security/noDangerouslySetInnerHtml: mermaid strict モードのサニタイズ済み SVG を描画するため
						dangerouslySetInnerHTML={{ __html: svg }}
					/>
				</div>

				{caption && <div className="diagram-modal-caption">{caption}</div>}
				<div className="diagram-modal-hint">
					ドラッグで移動 · ホイール/ボタンで拡大縮小 · Esc で閉じる
				</div>
			</div>
		</div>
	);
}
