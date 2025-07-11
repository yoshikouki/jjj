/**
 * Pure functions for formatting file information
 * All functions are side-effect free and deterministic
 */

import type { FileItem, FileType } from "../types/index.js";

/**
 * Format file size for display
 * Pure function: deterministic output for given input
 */
export const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return "0 B";

	const units = ["B", "KB", "MB", "GB", "TB"] as const;
	const k = 1024;
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	if (i === 0) return `${bytes} ${units[0]}`;

	const size = bytes / k ** i;
	const decimals = size < 10 ? 1 : 0;

	return `${size.toFixed(decimals)} ${units[i]}`;
};

/**
 * Format date for display
 * Pure function: deterministic output for given input
 */
export const formatDate = (date: Date): string => {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	// Today
	if (diffDays === 0) {
		return date.toLocaleTimeString(undefined, {
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	// Within a week
	if (diffDays < 7) {
		return `${diffDays}d ago`;
	}

	// Within current year
	if (date.getFullYear() === now.getFullYear()) {
		return date.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		});
	}

	// Older dates
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

/**
 * Get icon for file type
 * Pure function: deterministic output for given input
 */
export const getFileIcon = (item: FileItem): string => {
	if (item.type === "directory") {
		return item.name === ".." ? "↩" : "📁";
	}

	if (item.type === "symlink") {
		return "🔗";
	}

	// File icons based on extension
	if (!item.extension) {
		return "📄";
	}

	const ext = item.extension.toLowerCase();

	// Code files
	if (["js", "jsx", "ts", "tsx", "mjs", "cjs"].includes(ext)) return "📜";
	if (["json", "yaml", "yml", "toml", "xml"].includes(ext)) return "📋";
	if (["md", "mdx", "txt", "rst"].includes(ext)) return "📝";

	// Media files
	if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) return "🖼️";
	if (["mp4", "avi", "mov", "webm", "mkv"].includes(ext)) return "🎬";
	if (["mp3", "wav", "ogg", "flac", "aac"].includes(ext)) return "🎵";

	// Archives
	if (["zip", "tar", "gz", "bz2", "xz", "7z", "rar"].includes(ext)) return "📦";

	// Default
	return "📄";
};

/**
 * Format file permissions
 * Pure function: deterministic output for given input
 */
export const formatPermissions = (item: FileItem): string => {
	const r = item.isReadable ? "r" : "-";
	const w = item.isWritable ? "w" : "-";
	const x = item.isExecutable ? "x" : "-";

	return `${r}${w}${x}`;
};

/**
 * Truncate filename to fit terminal width
 * Pure function: deterministic output for given input
 */
export const truncateFilename = (
	name: string,
	maxLength: number,
	showExtension: boolean = true,
): string => {
	if (name.length <= maxLength) return name;

	const ellipsis = "…";
	const availableLength = maxLength - ellipsis.length;

	if (!showExtension) {
		return name.substring(0, availableLength) + ellipsis;
	}

	// Try to preserve extension
	const lastDot = name.lastIndexOf(".");
	if (lastDot === -1 || lastDot === 0) {
		return name.substring(0, availableLength) + ellipsis;
	}

	const extension = name.substring(lastDot);
	const basename = name.substring(0, lastDot);

	if (extension.length >= availableLength) {
		return name.substring(0, availableLength) + ellipsis;
	}

	const basenameLength = availableLength - extension.length;
	return basename.substring(0, basenameLength) + ellipsis + extension;
};

/**
 * Get file type description
 * Pure function: deterministic output for given input
 */
export const getFileTypeDescription = (type: FileType): string => {
	switch (type) {
		case "file":
			return "File";
		case "directory":
			return "Directory";
		case "symlink":
			return "Symbolic Link";
		case "unknown":
			return "Unknown";
		default: {
			// Exhaustive check
			const _exhaustive: never = type;
			void _exhaustive; // Suppress unused variable warning
			return "Unknown";
		}
	}
};

/**
 * Calculate column widths for file list display
 * Pure function: deterministic output for given input
 */
export const calculateColumnWidths = (
	_files: readonly FileItem[],
	terminalWidth: number,
): {
	icon: number;
	name: number;
	size: number;
	date: number;
	permissions: number;
} => {
	// Fixed widths
	const icon = 3;
	const size = 8;
	const date = 12;
	const permissions = 5;
	const padding = 4; // Spaces between columns

	// Calculate remaining width for name
	const fixedWidth = icon + size + date + permissions + padding * 4;
	const name = Math.max(20, terminalWidth - fixedWidth);

	return { icon, name, size, date, permissions };
};
