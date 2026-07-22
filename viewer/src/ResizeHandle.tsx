// pointer イベントで動くリサイズハンドル。外部ライブラリ不使用。
// ドラッグ中はポインタをキャプチャし、body に is-resizing を付けて
// テキスト選択とカーソルのちらつきを止める。
// 値の計算は親に委ねる: onResize(clientX, clientY) を毎フレーム呼ぶだけ。
import { useCallback, useRef } from "react";

interface ResizeHandleProps {
	orientation: "vertical" | "horizontal"; // vertical = 左右幅を変える縦線ハンドル
	onResize: (clientX: number, clientY: number) => void;
	ariaLabel: string;
}

export default function ResizeHandle({
	orientation,
	onResize,
	ariaLabel,
}: ResizeHandleProps) {
	const draggingRef = useRef(false);

	const handlePointerMove = useCallback(
		(e: PointerEvent) => {
			if (!draggingRef.current) return;
			onResize(e.clientX, e.clientY);
		},
		[onResize],
	);

	const endDrag = useCallback(() => {
		if (!draggingRef.current) return;
		draggingRef.current = false;
		document.body.classList.remove("is-resizing");
		window.removeEventListener("pointermove", handlePointerMove);
		window.removeEventListener("pointerup", endDrag);
		window.removeEventListener("pointercancel", endDrag);
	}, [handlePointerMove]);

	const startDrag = useCallback(
		(e: React.PointerEvent) => {
			e.preventDefault();
			draggingRef.current = true;
			document.body.classList.add("is-resizing");
			window.addEventListener("pointermove", handlePointerMove);
			window.addEventListener("pointerup", endDrag);
			window.addEventListener("pointercancel", endDrag);
		},
		[handlePointerMove, endDrag],
	);

	return (
		<div
			className={`resize-handle resize-handle-${orientation}`}
			onPointerDown={startDrag}
			role="separator"
			aria-orientation={orientation}
			aria-label={ariaLabel}
		/>
	);
}
