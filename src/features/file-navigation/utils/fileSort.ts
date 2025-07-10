/**
 * ファイルソート純粋関数（改良版）
 *
 * 全ての関数は副作用なしで、同じ入力に対して同じ出力を返す
 * テスタビリティと型安全性を重視した実装
 */

import type {
	FileItem,
	FileSortConfig,
	SortOrder,
	SortType,
} from "../types/index.js";

/**
 * ソート比較関数の型定義
 */
type SortComparator = (a: FileItem, b: FileItem) => number;

/**
 * ファイルリストをソート種別と順序でソートする純粋関数
 *
 * @param files - ソート対象のファイルリスト
 * @param sortBy - ソート種別
 * @param order - ソート順序
 * @returns ソートされたファイルリスト（新しい配列）
 */
export const sortFiles = (
	files: readonly FileItem[],
	sortBy: SortType,
	order: SortOrder = "asc",
): FileItem[] => {
	// 不変性を保つため、新しい配列を作成
	const sortedFiles = [...files];

	// ソート関数を取得
	const compareFn = getSortComparator(sortBy, order);

	return sortedFiles.sort(compareFn);
};

/**
 * ファイルリストをソート設定に従ってソートする純粋関数
 *
 * @param files - ソート対象のファイルリスト
 * @param config - ソート設定
 * @returns ソートされたファイルリスト（新しい配列）
 */
export const sortFilesByConfig = (
	files: readonly FileItem[],
	config: FileSortConfig,
): FileItem[] => {
	return sortFiles(files, config.sortBy, config.order);
};

/**
 * デフォルトのファイルソート（ディレクトリ優先、名前順）
 *
 * @param files - ソート対象のファイルリスト
 * @returns ソートされたファイルリスト（新しい配列）
 */
export const sortFilesDefault = (files: readonly FileItem[]): FileItem[] => {
	return [...files].sort((a, b) => {
		// ディレクトリを優先
		if (a.isDirectory && !b.isDirectory) return -1;
		if (!a.isDirectory && b.isDirectory) return 1;

		// 同じタイプなら名前順
		return a.name.localeCompare(b.name);
	});
};

/**
 * 親ディレクトリエントリを追加する純粋関数
 *
 * @param files - ファイルリスト
 * @param currentPath - 現在のパス
 * @returns 親ディレクトリエントリが追加されたファイルリスト
 */
export const addParentDirectory = (
	files: readonly FileItem[],
	currentPath: string,
): FileItem[] => {
	// ルートディレクトリの場合は親ディレクトリを追加しない
	if (currentPath === "/" || currentPath === "") {
		return [...files];
	}

	const parentEntry: FileItem = {
		name: "..",
		isDirectory: true,
		size: 0,
		modified: new Date(),
	};

	return [parentEntry, ...files];
};

/**
 * ソート比較関数を取得する純粋関数
 *
 * @param type - ソート種別
 * @param order - ソート順序
 * @returns 比較関数
 */
const getSortComparator = (
	type: SortType,
	order: SortOrder,
): SortComparator => {
	const multiplier = order === "asc" ? 1 : -1;

	switch (type) {
		case "name":
			return (a, b) => a.name.localeCompare(b.name) * multiplier;

		case "size":
			return (a, b) => {
				// ディレクトリサイズは0として扱う
				const aSize = a.isDirectory ? 0 : a.size;
				const bSize = b.isDirectory ? 0 : b.size;
				return (aSize - bSize) * multiplier;
			};

		case "modified":
			return (a, b) => {
				const aTime = a.modified.getTime();
				const bTime = b.modified.getTime();
				return (aTime - bTime) * multiplier;
			};

		case "type":
			return (a, b) => {
				// ディレクトリ vs ファイル
				if (a.isDirectory && !b.isDirectory) return -1 * multiplier;
				if (!a.isDirectory && b.isDirectory) return 1 * multiplier;

				// 同じタイプなら名前順
				return a.name.localeCompare(b.name) * multiplier;
			};

		default: {
			// 型安全性のため、exhaustive check
			const _exhaustiveCheck: never = type;
			return () => 0;
		}
	}
};

/**
 * ソート設定を検証する純粋関数
 *
 * @param config - ソート設定
 * @returns 検証結果
 */
export const validateSortConfig = (config: FileSortConfig): boolean => {
	const validTypes: SortType[] = ["name", "size", "modified", "type"];
	const validOrders: SortOrder[] = ["asc", "desc"];

	return (
		validTypes.includes(config.sortBy) && validOrders.includes(config.order)
	);
};

/**
 * デフォルトのソート設定を取得する純粋関数
 *
 * @returns デフォルトのソート設定
 */
export const getDefaultSortConfig = (): FileSortConfig => ({
	sortBy: "name",
	order: "asc",
});

/**
 * ファイルをフィルタリングする純粋関数
 *
 * @param files - ファイルリスト
 * @param predicate - フィルタリング条件
 * @returns フィルタリングされたファイルリスト
 */
export const filterFiles = (
	files: readonly FileItem[],
	predicate: (file: FileItem) => boolean,
): FileItem[] => {
	return files.filter(predicate);
};

/**
 * 隠しファイルを除外する純粋関数
 *
 * @param files - ファイルリスト
 * @returns 隠しファイルが除外されたファイルリスト
 */
export const excludeHiddenFiles = (files: readonly FileItem[]): FileItem[] => {
	return filterFiles(
		files,
		(file) => !file.name.startsWith(".") || file.name === "..",
	);
};

/**
 * ディレクトリのみを取得する純粋関数
 *
 * @param files - ファイルリスト
 * @returns ディレクトリのみのファイルリスト
 */
export const getDirectoriesOnly = (files: readonly FileItem[]): FileItem[] => {
	return filterFiles(files, (file) => file.isDirectory);
};

/**
 * ファイルのみを取得する純粋関数
 *
 * @param files - ファイルリスト
 * @returns ファイルのみのファイルリスト
 */
export const getFilesOnly = (files: readonly FileItem[]): FileItem[] => {
	return filterFiles(files, (file) => !file.isDirectory);
};

/**
 * ファイルサイズでフィルタリングする純粋関数
 *
 * @param files - ファイルリスト
 * @param minSize - 最小サイズ（バイト）
 * @param maxSize - 最大サイズ（バイト）
 * @returns サイズ条件に一致するファイルリスト
 */
export const filterFilesBySize = (
	files: readonly FileItem[],
	minSize?: number,
	maxSize?: number,
): FileItem[] => {
	return filterFiles(files, (file) => {
		if (file.isDirectory) return true; // ディレクトリは常に含める

		if (minSize !== undefined && file.size < minSize) return false;
		if (maxSize !== undefined && file.size > maxSize) return false;

		return true;
	});
};

/**
 * ファイル名でフィルタリングする純粋関数
 *
 * @param files - ファイルリスト
 * @param pattern - 検索パターン（大文字小文字を区別しない）
 * @returns パターンに一致するファイルリスト
 */
export const filterFilesByName = (
	files: readonly FileItem[],
	pattern: string,
): FileItem[] => {
	if (!pattern.trim()) return [...files];

	const lowerPattern = pattern.toLowerCase();
	return filterFiles(files, (file) =>
		file.name.toLowerCase().includes(lowerPattern),
	);
};

/**
 * 修更日でフィルタリングする純粋関数
 *
 * @param files - ファイルリスト
 * @param afterDate - この日以降に修更されたファイル
 * @param beforeDate - この日以前に修更されたファイル
 * @returns 修更日条件に一致するファイルリスト
 */
export const filterFilesByDate = (
	files: readonly FileItem[],
	afterDate?: Date,
	beforeDate?: Date,
): FileItem[] => {
	return filterFiles(files, (file) => {
		if (afterDate && file.modified < afterDate) return false;
		if (beforeDate && file.modified > beforeDate) return false;

		return true;
	});
};

/**
 * 複数の条件でフィルタリングする純粋関数
 *
 * @param files - ファイルリスト
 * @param options - フィルタリングオプション
 * @returns フィルタリングされたファイルリスト
 */
export interface FileFilterOptions {
	namePattern?: string;
	showHidden?: boolean;
	fileTypesOnly?: boolean;
	directoriesOnly?: boolean;
	minSize?: number;
	maxSize?: number;
	afterDate?: Date;
	beforeDate?: Date;
}

export const filterFilesByOptions = (
	files: readonly FileItem[],
	options: FileFilterOptions,
): FileItem[] => {
	let result = [...files];

	// 隠しファイルのフィルタリング
	if (!options.showHidden) {
		result = excludeHiddenFiles(result);
	}

	// ファイルタイプのフィルタリング
	if (options.fileTypesOnly) {
		result = getFilesOnly(result);
	} else if (options.directoriesOnly) {
		result = getDirectoriesOnly(result);
	}

	// 名前パターンのフィルタリング
	if (options.namePattern) {
		result = filterFilesByName(result, options.namePattern);
	}

	// サイズのフィルタリング
	if (options.minSize !== undefined || options.maxSize !== undefined) {
		result = filterFilesBySize(result, options.minSize, options.maxSize);
	}

	// 日付のフィルタリング
	if (options.afterDate || options.beforeDate) {
		result = filterFilesByDate(result, options.afterDate, options.beforeDate);
	}

	return result;
};

/**
 * ファイルリストの統計情報を計算する純粋関数
 *
 * @param files - ファイルリスト
 * @returns 統計情報
 */
export interface FileListStats {
	totalFiles: number;
	totalDirectories: number;
	totalSize: number;
	totalItems: number;
	averageFileSize: number;
	largestFile: FileItem | null;
	smallestFile: FileItem | null;
	newestFile: FileItem | null;
	oldestFile: FileItem | null;
}

export const calculateFileListStats = (
	files: readonly FileItem[],
): FileListStats => {
	const filesOnly = getFilesOnly(files);
	const directoriesOnly = getDirectoriesOnly(files);

	const totalSize = filesOnly.reduce((sum, file) => sum + file.size, 0);
	const averageFileSize =
		filesOnly.length > 0 ? totalSize / filesOnly.length : 0;

	// 最大・最小ファイル
	const largestFile = filesOnly.reduce(
		(largest, file) => (!largest || file.size > largest.size ? file : largest),
		null as FileItem | null,
	);

	const smallestFile = filesOnly.reduce(
		(smallest, file) =>
			!smallest || file.size < smallest.size ? file : smallest,
		null as FileItem | null,
	);

	// 最新・最古ファイル
	const newestFile = files.reduce(
		(newest, file) =>
			!newest || file.modified > newest.modified ? file : newest,
		null as FileItem | null,
	);

	const oldestFile = files.reduce(
		(oldest, file) =>
			!oldest || file.modified < oldest.modified ? file : oldest,
		null as FileItem | null,
	);

	return {
		totalFiles: filesOnly.length,
		totalDirectories: directoriesOnly.length,
		totalSize,
		totalItems: files.length,
		averageFileSize,
		largestFile,
		smallestFile,
		newestFile,
		oldestFile,
	};
};
