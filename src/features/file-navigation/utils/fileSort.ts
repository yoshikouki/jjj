/**
 * Pure functions for file sorting and filtering
 * All functions are side-effect free and deterministic
 */

import type {
	FileItem,
	FileStats,
	FilterOptions,
	SortConfig,
	SortKey,
} from "../types/index.js";

/**
 * Compare two files based on sort key
 */
const compareByName = (a: FileItem, b: FileItem): number =>
	a.name.localeCompare(b.name, undefined, {
		numeric: true,
		sensitivity: "base",
	});

const compareBySize = (a: FileItem, b: FileItem): number => a.size - b.size;

const compareByModified = (a: FileItem, b: FileItem): number =>
	a.modifiedAt.getTime() - b.modifiedAt.getTime();

const compareByType = (a: FileItem, b: FileItem): number => {
	const typeDiff = a.type.localeCompare(b.type);
	return typeDiff !== 0 ? typeDiff : compareByName(a, b);
};

/**
 * Get comparator function for sort key
 */
const getComparator = (
	sortKey: SortKey,
): ((a: FileItem, b: FileItem) => number) => {
	switch (sortKey) {
		case "name":
			return compareByName;
		case "size":
			return compareBySize;
		case "modified":
			return compareByModified;
		case "type":
			return compareByType;
		default: {
			// Exhaustive check
			const _exhaustive: never = sortKey;
			void _exhaustive; // Suppress unused variable warning
			return compareByName;
		}
	}
};

/**
 * Sort files with given configuration
 * Pure function: returns new array without mutating input
 */
export const sortFiles = (
	files: readonly FileItem[],
	config: SortConfig,
): readonly FileItem[] => {
	const comparator = getComparator(config.key);
	const sorted = [...files].sort((a, b) => {
		const result = comparator(a, b);
		return config.order === "asc" ? result : -result;
	});

	return sorted;
};

/**
 * Filter files based on options
 * Pure function: returns new array without mutating input
 */
export const filterFiles = (
	files: readonly FileItem[],
	options: FilterOptions,
): readonly FileItem[] => {
	return files.filter((file) => {
		// Hidden files filter
		if (!options.showHidden && file.isHidden) {
			return false;
		}

		// Extension filter
		if (options.extensions && options.extensions.length > 0) {
			if (file.type === "directory") return true;
			if (!file.extension) return false;
			return options.extensions.includes(file.extension.toLowerCase());
		}

		// Search query filter
		if (options.searchQuery) {
			const query = options.searchQuery.toLowerCase();
			return file.name.toLowerCase().includes(query);
		}

		return true;
	});
};

/**
 * Sort with directories first option
 * Pure function: returns new array without mutating input
 */
export const sortWithDirectoriesFirst = (
	files: readonly FileItem[],
	showDirectoriesFirst: boolean,
): readonly FileItem[] => {
	if (!showDirectoriesFirst) return files;

	const directories = files.filter((f) => f.type === "directory");
	const nonDirectories = files.filter((f) => f.type !== "directory");

	return [...directories, ...nonDirectories];
};

/**
 * Apply all sorting and filtering operations
 * Pure function: returns new array without mutating input
 */
export const processFiles = (
	files: readonly FileItem[],
	sortConfig: SortConfig,
	filterOptions: FilterOptions,
): readonly FileItem[] => {
	// Apply filters first
	const filtered = filterFiles(files, filterOptions);

	// Then sort
	const sorted = sortFiles(filtered, sortConfig);

	// Finally apply directories first if needed
	return sortWithDirectoriesFirst(sorted, filterOptions.showDirectoriesFirst);
};

/**
 * Calculate file statistics
 * Pure function: computes stats from file array
 */
export const calculateFileStats = (files: readonly FileItem[]): FileStats => {
	const stats = files.reduce(
		(acc, file) => ({
			totalCount: acc.totalCount + 1,
			fileCount: acc.fileCount + (file.type === "file" ? 1 : 0),
			directoryCount: acc.directoryCount + (file.type === "directory" ? 1 : 0),
			totalSize: acc.totalSize + file.size,
			hiddenCount: acc.hiddenCount + (file.isHidden ? 1 : 0),
		}),
		{
			totalCount: 0,
			fileCount: 0,
			directoryCount: 0,
			totalSize: 0,
			hiddenCount: 0,
		},
	);

	return stats;
};

/**
 * Get file at index with bounds checking
 * Pure function: returns file or undefined
 */
export const getFileAtIndex = (
	files: readonly FileItem[],
	index: number,
): FileItem | undefined => {
	if (index < 0 || index >= files.length) {
		return undefined;
	}
	return files[index];
};

/**
 * Find index of file by path
 * Pure function: returns index or -1
 */
export const findFileIndex = (
	files: readonly FileItem[],
	path: string,
): number => {
	return files.findIndex((file) => file.path === path);
};

/**
 * Async version of processFiles for non-blocking operations
 * Yields control back to the browser to prevent UI blocking
 */
export const processFilesAsync = async (
	files: readonly FileItem[],
	sortConfig: SortConfig,
	filterOptions: FilterOptions,
): Promise<readonly FileItem[]> => {
	// Use scheduler to yield control back to the browser
	await new Promise((resolve) => setTimeout(resolve, 0));

	return processFiles(files, sortConfig, filterOptions);
};
