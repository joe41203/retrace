// 言語名 → GitHub 風のドット色。未知の言語はグレーにフォールバック。
// 主要な言語のみ定義。増やしたくなったらここに足す。
const LANG_COLORS: Record<string, string> = {
	Go: "#00add8",
	TypeScript: "#3178c6",
	JavaScript: "#f1e05a",
	Python: "#3572a5",
	Rust: "#dea584",
	Ruby: "#701516",
	Java: "#b07219",
	Kotlin: "#a97bff",
	Swift: "#f05138",
	"C++": "#f34b7d",
	C: "#555555",
	"C#": "#178600",
	PHP: "#4f5d95",
	Shell: "#89e051",
	HTML: "#e34c26",
	CSS: "#563d7c",
	Vue: "#41b883",
	Elixir: "#6e4a7e",
	Scala: "#c22d40",
	Dart: "#00b4ab",
	Zig: "#ec915c",
};

export function langColor(language: string | null | undefined): string {
	if (!language) return "#8c959f"; // 不明はグレー
	return LANG_COLORS[language] ?? "#8c959f";
}
