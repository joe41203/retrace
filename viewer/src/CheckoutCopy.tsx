// コミットメタ部の「この時点のコードを手元で開く」コマンドコピー UI。
// - フル版: git clone <url>.git && cd <repo> && git checkout <sha>
// - 簡易版: git checkout <sha>
// clipboard API が使えない環境では壊れず、コマンド全文を選択可能な形で表示する。
import { useCallback, useRef, useState } from "react";
import type { Repo } from "./types";

interface CheckoutCopyProps {
	sha: string;
	repo: Repo | null;
}

// repo.url は末尾 .git 無しの想定(例 https://github.com/nakabonne/ali)。二重 .git を避ける。
function cloneUrl(url: string): string {
	return url.endsWith(".git") ? url : `${url}.git`;
}

export default function CheckoutCopy({ sha, repo }: CheckoutCopyProps) {
	// どのボタンが直近コピー成功したか(ラベル一時変化用)。失敗したコマンドはフォールバック表示。
	const [copiedKey, setCopiedKey] = useState<string | null>(null);
	const [failedCommand, setFailedCommand] = useState<string | null>(null);
	const timerRef = useRef<number | null>(null);

	const fullCommand = repo
		? `git clone ${cloneUrl(repo.url)} && cd ${repo.repo} && git checkout ${sha}`
		: null;
	const checkoutCommand = `git checkout ${sha}`;

	const copy = useCallback(async (key: string, command: string) => {
		setFailedCommand(null);
		try {
			if (!navigator.clipboard?.writeText)
				throw new Error("clipboard unavailable");
			await navigator.clipboard.writeText(command);
			setCopiedKey(key);
			if (timerRef.current) window.clearTimeout(timerRef.current);
			timerRef.current = window.setTimeout(() => setCopiedKey(null), 1500);
		} catch {
			// https 以外などで clipboard が使えないとき: 全文を選択可能な形で見せる(prompt は使わない)
			setCopiedKey(null);
			setFailedCommand(command);
		}
	}, []);

	return (
		<div className="checkout-copy">
			<span className="checkout-sha" title={`コミット ${sha}`}>
				{sha.slice(0, 7)}
			</span>
			{fullCommand && (
				<button
					type="button"
					className="checkout-btn"
					title={fullCommand}
					onClick={() => copy("full", fullCommand)}
				>
					{copiedKey === "full" ? "コピーしました" : "clone してこの時点へ"}
				</button>
			)}
			<button
				type="button"
				className="checkout-btn"
				title={checkoutCommand}
				onClick={() => copy("checkout", checkoutCommand)}
			>
				{copiedKey === "checkout" ? "コピーしました" : "checkout のみ"}
			</button>
			{failedCommand && (
				<div className="checkout-fallback">
					<span>
						クリップボードが使えないため、以下を手動でコピーしてください:
					</span>
					<code className="checkout-fallback-cmd">{failedCommand}</code>
				</div>
			)}
		</div>
	);
}
