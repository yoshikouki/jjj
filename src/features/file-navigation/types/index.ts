/**
 * ファイルナビゲーション機能の型定義
 */

/**
 * ファイル/ディレクトリ情報
 */
export interface FileItem {
	name: string;
	isDirectory: boolean;
	size: number;
	modified: Date;
}

/**
 * ファイルソート順序
 */
export type SortOrder = "asc" | "desc";

/**
 * ファイルソート種別
 */
export type SortType = "name" | "size" | "modified" | "type";

/**
 * ファイルソート設定
 */
export interface FileSortConfig {
	sortBy: SortType;
	order: SortOrder;
}

/**
 * ファイルシステム操作結果
 */
export interface FileSystemResult<T> {
	success: boolean;
	data?: T;
	error?: string;
}

/**
 * ディレクトリ読み取り結果
 */
export type DirectoryReadResult = FileSystemResult<FileItem[]>;

/**
 * ファイルプレビュー結果
 */
export type FilePreviewResult = FileSystemResult<string>;

/**
 * ファイルナビゲーション状態
 */
export interface FileNavigationState {
	currentPath: string;
	files: FileItem[];
	selectedIndex: number;
	error: string | null;
	isLoading: boolean;
	sortConfig: FileSortConfig;
}

/**
 * ファイルナビゲーションアクション
 */
export interface FileNavigationActions {
	navigateToDirectory: (path: string) => Promise<void>;
	navigateUp: () => Promise<void>;
	selectFile: (index: number) => void;
	selectNext: () => void;
	selectPrevious: () => void;
	setSortConfig: (config: FileSortConfig) => void;
	refreshFiles: () => Promise<void>;
}

/**
 * ファイルナビゲーションフック戻り値
 */
export interface UseFileNavigation {
	state: FileNavigationState;
	actions: FileNavigationActions;
}

/**
 * ターミナルサイズ情報
 */
export interface TerminalSize {
	width: number;
	height: number;
}

/**
 * 表示設定
 */
export interface DisplayConfig {
	terminalSize: TerminalSize;
	showFileSize: boolean;
	showModifiedDate: boolean;
	maxFileNameLength: number;
}

/**
 * スクロール情報
 */
export interface ScrollInfo {
	visibleStartIndex: number;
	visibleEndIndex: number;
	totalItems: number;
	availableHeight: number;
}
