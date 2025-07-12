/**
 * File Preview Types
 * Type definitions for file preview functionality
 */

import type { FileItem } from "../../file-navigation/types/index.js";

/**
 * Preview display options
 */
export interface PreviewDisplayOptions {
	/** Show line numbers */
	readonly showLineNumbers: boolean;
	/** Show file info in header */
	readonly showFileInfo: boolean;
	/** Word wrap mode */
	readonly wordWrap: boolean;
}

/**
 * Default display options
 */
export const DEFAULT_DISPLAY_OPTIONS: PreviewDisplayOptions = {
	showLineNumbers: true,
	showFileInfo: true,
	wordWrap: false,
};

/**
 * Preview state
 */
export interface PreviewState {
	/** Currently previewing file */
	readonly file: FileItem | null;
	/** Preview content */
	readonly content: string | null;
	/** Preview loading state */
	readonly isLoading: boolean;
	/** Preview error */
	readonly error: string | null;
	/** Preview visibility */
	readonly isVisible: boolean;
	/** Current scroll position */
	readonly scrollOffset: number;
	/** Display options */
	readonly displayOptions: PreviewDisplayOptions;
}

/**
 * Preview configuration
 */
export interface PreviewConfig {
	/** Maximum bytes to read for preview */
	readonly maxBytes: number;
	/** File extensions to preview */
	readonly supportedExtensions: readonly string[];
	/** Maximum file size to preview (in bytes) */
	readonly maxFileSize: number;
}

/**
 * Default preview configuration
 */
export const DEFAULT_PREVIEW_CONFIG: PreviewConfig = {
	maxBytes: 10240, // 10KB
	supportedExtensions: [
		".txt",
		".md",
		".json",
		".js",
		".ts",
		".tsx",
		".jsx",
		".css",
		".html",
		".xml",
		".yml",
		".yaml",
		".sh",
		".py",
		".rs",
		".go",
		".java",
		".c",
		".cpp",
		".h",
		".hpp",
	],
	maxFileSize: 1024 * 1024, // 1MB
};
