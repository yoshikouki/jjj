/**
 * ファイルフォーマット純粋関数
 *
 * ファイルサイズ、名前、日付の表示フォーマットを担当
 * 全ての関数は副作用なしで、同じ入力に対して同じ出力を返す
 */

import * as path from "node:path";
import type { DisplayConfig, FileItem, TerminalSize } from "../types/index.js";

/**
 * ファイルサイズを人間が読みやすい形式にフォーマットする純粋関数
 *
 * @param bytes - バイト数
 * @returns フォーマットされたファイルサイズ
 */
export const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return "0 B";

	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	// 適切な単位に変換
	const size = bytes / k ** i;

	// 小数点以下の桁数を制御
	const formatted = i === 0 ? size.toString() : size.toFixed(1);

	return `${formatted} ${sizes[i]}`;
};

/**
 * ファイル名をターミナル幅に合わせて切り詰める純粋関数
 *
 * @param name - ファイル名
 * @param terminalWidth - ターミナル幅
 * @returns 切り詰められたファイル名
 */
export const truncateFileName = (
	name: string,
	terminalWidth: number,
): string => {
	// アイコンとインデント用の予約領域を考慮
	const reservedWidth = 25;
	const availableWidth = Math.max(20, terminalWidth - reservedWidth);

	if (name.length <= availableWidth) {
		return name;
	}

	// ファイル拡張子を保持
	const ext = path.extname(name);
	const baseName = path.basename(name, ext);
	const ellipsis = "...";
	const maxBaseLength = availableWidth - ext.length - ellipsis.length;

	// 最小限の文字数を確保
	if (maxBaseLength < 5) {
		return `${name.slice(0, availableWidth - ellipsis.length)}${ellipsis}`;
	}

	return `${baseName.slice(0, maxBaseLength)}${ellipsis}${ext}`;
};

/**
 * 日付を相対的な形式でフォーマットする純粋関数
 *
 * @param date - 日付
 * @param now - 現在時刻（テスト用）
 * @returns フォーマットされた日付
 */
export const formatRelativeDate = (
	date: Date,
	now: Date = new Date(),
): string => {
	const diffMs = now.getTime() - date.getTime();
	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMinutes < 1) {
		return "just now";
	} else if (diffMinutes < 60) {
		return `${diffMinutes}m ago`;
	} else if (diffHours < 24) {
		return `${diffHours}h ago`;
	} else if (diffDays < 7) {
		return `${diffDays}d ago`;
	} else {
		return date.toLocaleDateString();
	}
};

/**
 * 日付を絶対的な形式でフォーマットする純粋関数
 *
 * @param date - 日付
 * @returns フォーマットされた日付
 */
export const formatAbsoluteDate = (date: Date): string => {
	return date.toLocaleDateString("ja-JP", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
};

/**
 * ファイルアイコンを取得する純粋関数
 *
 * @param file - ファイル情報
 * @returns ファイルアイコン
 */
export const getFileIcon = (file: FileItem): string => {
	if (file.isDirectory) {
		return file.name === ".." ? "📁" : "📁";
	}

	const ext = path.extname(file.name).toLowerCase();

	// 拡張子によってアイコンを決定
	switch (ext) {
		case ".js":
		case ".jsx":
		case ".ts":
		case ".tsx":
			return "📜";
		case ".json":
			return "📋";
		case ".md":
		case ".txt":
			return "📄";
		case ".png":
		case ".jpg":
		case ".jpeg":
		case ".gif":
		case ".svg":
			return "🖼️";
		case ".pdf":
			return "📕";
		case ".zip":
		case ".tar":
		case ".gz":
			return "📦";
		case ".exe":
		case ".app":
			return "⚙️";
		default:
			return "📄";
	}
};

/**
 * ファイル情報を一行で表示する形式でフォーマットする純粋関数
 *
 * @param file - ファイル情報
 * @param config - 表示設定
 * @returns フォーマットされた表示文字列
 */
export const formatFileDisplay = (
	file: FileItem,
	config: DisplayConfig,
): string => {
	const icon = getFileIcon(file);
	const truncatedName = truncateFileName(file.name, config.terminalSize.width);

	let display = `${icon} ${truncatedName}`;

	// ファイルサイズの表示
	if (
		config.showFileSize &&
		!file.isDirectory &&
		config.terminalSize.width > 60
	) {
		const size = formatFileSize(file.size);
		display += ` (${size})`;
	}

	// 更新日時の表示
	if (config.showModifiedDate && config.terminalSize.width > 80) {
		const date = formatRelativeDate(file.modified);
		display += ` - ${date}`;
	}

	return display;
};

/**
 * パスを短縮表示する純粋関数
 *
 * @param fullPath - 完全パス
 * @param terminalWidth - ターミナル幅
 * @returns 短縮されたパス
 */
export const truncatePath = (
	fullPath: string,
	terminalWidth: number,
): string => {
	const maxWidth = terminalWidth - 10; // アイコン等の余白

	if (fullPath.length <= maxWidth) {
		return fullPath;
	}

	const parts = fullPath.split(path.sep);

	// ホームディレクトリの短縮
	if (parts.length > 1 && parts[1] === "home") {
		const homeIndex = parts.indexOf("home");
		if (homeIndex >= 0 && homeIndex + 1 < parts.length) {
			parts[homeIndex] = "~";
			parts.splice(homeIndex + 1, 1); // ユーザー名を削除
		}
	}

	// 最後の部分を保持しつつ、必要に応じて中間部分を省略
	if (parts.length > 3) {
		const start = parts.slice(0, 2);
		const end = parts.slice(-2);
		const middle = parts.length > 4 ? ["..."] : [];

		const shortened = [...start, ...middle, ...end].join(path.sep);

		if (shortened.length <= maxWidth) {
			return shortened;
		}
	}

	// それでも長い場合は末尾を切り詰め
	const ellipsis = "...";
	return `${ellipsis}${fullPath.slice(-(maxWidth - ellipsis.length))}`;
};

/**
 * スクロールインジケータをフォーマットする純粋関数
 *
 * @param visibleStart - 表示開始位置
 * @param visibleEnd - 表示終了位置
 * @param total - 総アイテム数
 * @returns フォーマットされたスクロールインジケータ
 */
export const formatScrollIndicator = (
	visibleStart: number,
	visibleEnd: number,
	total: number,
): string => {
	const hasUp = visibleStart > 0;
	const hasDown = visibleEnd < total;

	let indicator = `${visibleStart + 1}-${visibleEnd} of ${total}`;

	if (hasUp) {
		indicator = `↑ ${indicator}`;
	}

	if (hasDown) {
		indicator = `${indicator} ↓`;
	}

	return indicator;
};

/**
 * デフォルトの表示設定を取得する純粋関数
 *
 * @param terminalSize - ターミナルサイズ
 * @returns デフォルトの表示設定
 */
export const getDefaultDisplayConfig = (
	terminalSize: TerminalSize,
): DisplayConfig => ({
	terminalSize,
	showFileSize: terminalSize.width > 60,
	showModifiedDate: terminalSize.width > 80,
	maxFileNameLength: Math.max(20, terminalSize.width - 25),
});

/**
 * 複数のファイルサイズの合計を計算する純粋関数
 *
 * @param files - ファイルリスト
 * @returns 合計サイズ
 */
export const calculateTotalSize = (files: readonly FileItem[]): number => {
	return files.reduce((total, file) => {
		return total + (file.isDirectory ? 0 : file.size);
	}, 0);
};

/**
 * ファイル数とディレクトリ数を集計する純粋関数
 *
 * @param files - ファイルリスト
 * @returns 集計結果
 */
export const countFileTypes = (
	files: readonly FileItem[],
): {
	files: number;
	directories: number;
} => {
	return files.reduce(
		(counts, file) => {
			if (file.isDirectory) {
				counts.directories++;
			} else {
				counts.files++;
			}
			return counts;
		},
		{ files: 0, directories: 0 },
	);
};
