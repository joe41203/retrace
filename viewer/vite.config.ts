import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import react from "@vitejs/plugin-react";
import {
	defineConfig,
	type Plugin,
	type ViteDevServer,
	type PreviewServer,
} from "vite";

// repo ルートの data/ を手動コピーなしで /data/* として配信する。
// generator が焼いた JSON をビューアがそのまま fetch できるようにするための最小サーバ。
const DATA_ROOT = resolve(__dirname, "..", "data");

const MIME: Record<string, string> = {
	".json": "application/json; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
};

function serveData(): Plugin {
	const middleware = (
		req: { url?: string },
		res: {
			statusCode: number;
			setHeader: (k: string, v: string) => void;
			end: (chunk?: string) => void;
		},
		next: () => void,
	) => {
		const url = req.url ?? "";
		if (!url.startsWith("/data/")) {
			next();
			return;
		}

		// クエリ・ハッシュを落としてから復号
		const rawPath = decodeURIComponent(
			url.replace(/[?#].*$/, "").slice("/data/".length),
		);
		// パストラバーサル防止: 正規化後に DATA_ROOT 配下であることを確認
		const target = normalize(join(DATA_ROOT, rawPath));
		if (target !== DATA_ROOT && !target.startsWith(DATA_ROOT + sep)) {
			res.statusCode = 403;
			res.end("Forbidden");
			return;
		}

		if (!existsSync(target) || !statSync(target).isFile()) {
			res.statusCode = 404;
			res.setHeader("Content-Type", "application/json; charset=utf-8");
			res.end(JSON.stringify({ error: "not found", path: rawPath }));
			return;
		}

		res.statusCode = 200;
		res.setHeader(
			"Content-Type",
			MIME[extname(target)] ?? "application/octet-stream",
		);
		// 開発中はデータが更新されうるのでキャッシュさせない
		res.setHeader("Cache-Control", "no-store");
		createReadStream(target).pipe(res as unknown as NodeJS.WritableStream);
	};

	return {
		name: "retrace-serve-data",
		configureServer(server: ViteDevServer) {
			server.middlewares.use(middleware);
		},
		configurePreviewServer(server: PreviewServer) {
			server.middlewares.use(middleware);
		},
	};
}

export default defineConfig({
	plugins: [react(), serveData()],
	server: {
		fs: {
			// repo ルートの data/ を dev サーバの許可対象に含める
			allow: [resolve(__dirname), DATA_ROOT],
		},
	},
});
