/**
 * ファイルソート純粋関数
 *
 * 全ての関数は副作用なしで、同じ入力に対して同じ出力を返す
 */

import type { FileItem, FileSortConfig, SortOrder, SortType } from "../types/index.js";

/**
 * ファイルリストをソート設定に従ってソートする純粋関数
 *
 * @param files - ソート対象のファイルリスト
 * @param config - ソート設定
 * @returns ソートされたファイルリスト（新しい配列）
 */
export const sortFiles = (
	files: readonly FileItem[],
	config: FileSortConfig,
): FileItem[] => {
	// 不変性を保つため、新しい配列を作成
	const sortedFiles = [...files];

	// ソート関数を取得
	const compareFn = getSortComparator(config.type, config.order);

	return sortedFiles.sort(compareFn);
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
	if (currentPath === "/") {
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
): ((a: FileItem, b: FileItem) => number) => {
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

		default:
			return (a, b) => a.name.localeCompare(b.name) * multiplier;
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

	return validTypes.includes(config.type) && validOrders.includes(config.order);
};

/**
 * デフォルトのソート設定を取得する純粋関数
 *
 * @returns デフォルトのソート設定
 */
export const getDefaultSortConfig = (): FileSortConfig => ({
	type: "name",
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
