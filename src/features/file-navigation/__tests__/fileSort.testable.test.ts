/**
 * ファイルソート純粋関数のテスト（テスタブル設計の実証）
 *
 * 純粋関数により、any 型や unknown 型を使わずに完全にテスタブルな実装
 */

import { describe, expect, test } from "bun:test";
import type { FileItem, FileSortConfig } from "../types/index.js";
import {
	addParentDirectory,
	calculateFileListStats,
	excludeHiddenFiles,
	filterFiles,
	filterFilesByDate,
	filterFilesByName,
	filterFilesByOptions,
	filterFilesBySize,
	getDefaultSortConfig,
	getDirectoriesOnly,
	getFilesOnly,
	sortFiles,
	sortFilesByConfig,
	validateSortConfig,
} from "../utils/fileSort.js";

// テスト用のファイルデータを作成する純粋関数
const createTestFile = (
	name: string,
	isDirectory: boolean,
	size: number = 1024,
	modified: Date = new Date("2023-01-01T12:00:00Z"),
): FileItem => ({
	name,
	isDirectory,
	size,
	modified,
});

// テスト用のファイルリストを作成
const createTestFiles = (): FileItem[] => [
	createTestFile("file1.txt", false, 1024, new Date("2023-01-01T12:00:00Z")),
	createTestFile("file2.js", false, 512, new Date("2023-01-01T11:00:00Z")),
	createTestFile("directory1", true, 0, new Date("2023-01-01T13:00:00Z")),
	createTestFile(".hidden", false, 256, new Date("2023-01-01T10:00:00Z")),
	createTestFile("file3.md", false, 2048, new Date("2023-01-01T14:00:00Z")),
];

describe("sortFiles - Pure Function Tests", () => {
	test("should sort files by name in ascending order", () => {
		const files = createTestFiles();

		const result = sortFiles(files, "name", "asc");

		expect(result).toHaveLength(5);
		expect(result[0].name).toBe(".hidden");
		expect(result[1].name).toBe("directory1");
		expect(result[2].name).toBe("file1.txt");
		expect(result[3].name).toBe("file2.js");
		expect(result[4].name).toBe("file3.md");
	});

	test("should sort files by name in descending order", () => {
		const files = createTestFiles();

		const result = sortFiles(files, "name", "desc");

		expect(result[0].name).toBe("file3.md");
		expect(result[1].name).toBe("file2.js");
		expect(result[2].name).toBe("file1.txt");
		expect(result[3].name).toBe("directory1");
		expect(result[4].name).toBe(".hidden");
	});

	test("should sort files by size", () => {
		const files = createTestFiles();

		const result = sortFiles(files, "size", "desc");

		// ディレクトリのサイズは0として扱われる
		const fileSizes = result.filter((f) => !f.isDirectory).map((f) => f.size);
		expect(fileSizes[0]).toBe(2048); // file3.md
		expect(fileSizes[1]).toBe(1024); // file1.txt
		expect(fileSizes[2]).toBe(512); // file2.js
		expect(fileSizes[3]).toBe(256); // .hidden
	});

	test("should sort files by modified date", () => {
		const files = createTestFiles();

		const result = sortFiles(files, "modified", "asc");

		const times = result.map((f) => f.modified.getTime());
		for (let i = 0; i < times.length - 1; i++) {
			expect(times[i]).toBeLessThanOrEqual(times[i + 1]);
		}
	});

	test("should sort files by type (directories first)", () => {
		const files = createTestFiles();

		const result = sortFiles(files, "type", "asc");

		const directories = result.filter((f) => f.isDirectory);
		const regularFiles = result.filter((f) => !f.isDirectory);

		expect(directories).toHaveLength(1);
		expect(regularFiles).toHaveLength(4);

		// ディレクトリが最初に来ることを確認
		expect(result[0].isDirectory).toBe(true);
	});

	test("should not mutate original array", () => {
		const files = createTestFiles();
		const originalOrder = files.map((f) => f.name);

		sortFiles(files, "name", "desc");

		// 元の配列は変更されていない
		expect(files.map((f) => f.name)).toEqual(originalOrder);
	});
});

describe("sortFilesByConfig - Configuration-based Sorting", () => {
	test("should sort using configuration object", () => {
		const files = createTestFiles();
		const config: FileSortConfig = { sortBy: "size", order: "desc" };

		const result = sortFilesByConfig(files, config);

		const nonDirFiles = result.filter((f) => !f.isDirectory);
		expect(nonDirFiles[0].size).toBe(2048);
		expect(nonDirFiles[1].size).toBe(1024);
	});
});

describe("addParentDirectory - Pure Function", () => {
	test("should add parent directory entry for non-root paths", () => {
		const files = createTestFiles();

		const result = addParentDirectory(files, "/home/user");

		expect(result).toHaveLength(6);
		expect(result[0].name).toBe("..");
		expect(result[0].isDirectory).toBe(true);
	});

	test("should not add parent directory for root path", () => {
		const files = createTestFiles();

		const result = addParentDirectory(files, "/");

		expect(result).toHaveLength(5);
		expect(result[0].name).not.toBe("..");
	});

	test("should not add parent directory for empty path", () => {
		const files = createTestFiles();

		const result = addParentDirectory(files, "");

		expect(result).toHaveLength(5);
		expect(result[0].name).not.toBe("..");
	});
});

describe("filterFiles - Generic Filtering", () => {
	test("should filter files using predicate function", () => {
		const files = createTestFiles();

		const result = filterFiles(files, (file) => file.size > 512);

		expect(result).toHaveLength(2);
		expect(result.every((f) => f.size > 512)).toBe(true);
	});

	test("should return empty array when no files match", () => {
		const files = createTestFiles();

		const result = filterFiles(files, (file) => file.size > 10000);

		expect(result).toHaveLength(0);
	});
});

describe("excludeHiddenFiles - Pure Function", () => {
	test("should exclude hidden files but keep parent directory", () => {
		const files = createTestFiles();

		const result = excludeHiddenFiles(files);

		expect(result).toHaveLength(4);
		expect(
			result.every((f) => !f.name.startsWith(".") || f.name === ".."),
		).toBe(true);
	});
});

describe("getDirectoriesOnly and getFilesOnly", () => {
	test("should return only directories", () => {
		const files = createTestFiles();

		const result = getDirectoriesOnly(files);

		expect(result).toHaveLength(1);
		expect(result.every((f) => f.isDirectory)).toBe(true);
	});

	test("should return only files", () => {
		const files = createTestFiles();

		const result = getFilesOnly(files);

		expect(result).toHaveLength(4);
		expect(result.every((f) => !f.isDirectory)).toBe(true);
	});
});

describe("filterFilesBySize - Size-based Filtering", () => {
	test("should filter files by minimum size", () => {
		const files = createTestFiles();

		const result = filterFilesBySize(files, 1000);

		const regularFiles = result.filter((f) => !f.isDirectory);
		expect(regularFiles.every((f) => f.size >= 1000)).toBe(true);
	});

	test("should filter files by maximum size", () => {
		const files = createTestFiles();

		const result = filterFilesBySize(files, undefined, 1000);

		const regularFiles = result.filter((f) => !f.isDirectory);
		expect(regularFiles.every((f) => f.size <= 1000)).toBe(true);
	});

	test("should include directories regardless of size filter", () => {
		const files = createTestFiles();

		const result = filterFilesBySize(files, 10000); // Very high minimum

		const directories = result.filter((f) => f.isDirectory);
		expect(directories).toHaveLength(1);
	});
});

describe("filterFilesByName - Name Pattern Filtering", () => {
	test("should filter files by name pattern (case insensitive)", () => {
		const files = createTestFiles();

		const result = filterFilesByName(files, "file");

		expect(result).toHaveLength(3);
		expect(result.every((f) => f.name.toLowerCase().includes("file"))).toBe(
			true,
		);
	});

	test("should return all files for empty pattern", () => {
		const files = createTestFiles();

		const result = filterFilesByName(files, "");

		expect(result).toHaveLength(5);
	});
});

describe("filterFilesByDate - Date-based Filtering", () => {
	test("should filter files modified after specific date", () => {
		const files = createTestFiles();
		const afterDate = new Date("2023-01-01T12:30:00Z");

		const result = filterFilesByDate(files, afterDate);

		expect(result.every((f) => f.modified >= afterDate)).toBe(true);
	});

	test("should filter files modified before specific date", () => {
		const files = createTestFiles();
		const beforeDate = new Date("2023-01-01T12:30:00Z");

		const result = filterFilesByDate(files, undefined, beforeDate);

		expect(result.every((f) => f.modified <= beforeDate)).toBe(true);
	});
});

describe("filterFilesByOptions - Complex Filtering", () => {
	test("should apply multiple filters simultaneously", () => {
		const files = createTestFiles();

		const result = filterFilesByOptions(files, {
			showHidden: false,
			fileTypesOnly: true,
			minSize: 500,
			namePattern: "file",
		});

		expect(
			result.every(
				(f) =>
					!f.isDirectory &&
					f.size >= 500 &&
					f.name.toLowerCase().includes("file") &&
					(!f.name.startsWith(".") || f.name === ".."),
			),
		).toBe(true);
	});

	test("should return all files when no options specified", () => {
		const files = createTestFiles();

		const result = filterFilesByOptions(files, {});

		expect(result).toHaveLength(4); // Hidden files excluded by default
	});
});

describe("calculateFileListStats - Statistics Calculation", () => {
	test("should calculate accurate file statistics", () => {
		const files = createTestFiles();

		const stats = calculateFileListStats(files);

		expect(stats.totalFiles).toBe(4);
		expect(stats.totalDirectories).toBe(1);
		expect(stats.totalItems).toBe(5);
		expect(stats.totalSize).toBe(1024 + 512 + 256 + 2048);
		expect(stats.averageFileSize).toBe((1024 + 512 + 256 + 2048) / 4);

		expect(stats.largestFile?.name).toBe("file3.md");
		expect(stats.largestFile?.size).toBe(2048);

		expect(stats.smallestFile?.name).toBe(".hidden");
		expect(stats.smallestFile?.size).toBe(256);
	});

	test("should handle empty file list", () => {
		const stats = calculateFileListStats([]);

		expect(stats.totalFiles).toBe(0);
		expect(stats.totalDirectories).toBe(0);
		expect(stats.totalItems).toBe(0);
		expect(stats.totalSize).toBe(0);
		expect(stats.averageFileSize).toBe(0);

		expect(stats.largestFile).toBe(null);
		expect(stats.smallestFile).toBe(null);
		expect(stats.newestFile).toBe(null);
		expect(stats.oldestFile).toBe(null);
	});
});

describe("validateSortConfig and getDefaultSortConfig", () => {
	test("should validate correct sort configuration", () => {
		const validConfig: FileSortConfig = { sortBy: "name", order: "asc" };

		expect(validateSortConfig(validConfig)).toBe(true);
	});

	test("should reject invalid sort configuration", () => {
		const invalidConfig = { sortBy: "invalid", order: "asc" } as any;

		expect(validateSortConfig(invalidConfig)).toBe(false);
	});

	test("should return default sort configuration", () => {
		const defaultConfig = getDefaultSortConfig();

		expect(defaultConfig.sortBy).toBe("name");
		expect(defaultConfig.order).toBe("asc");
		expect(validateSortConfig(defaultConfig)).toBe(true);
	});
});

describe("Pure Function Properties", () => {
	test("functions should be deterministic", () => {
		const files = createTestFiles();

		// 同じ入力に対して同じ出力を返すことを確認
		const result1 = sortFiles(files, "name", "asc");
		const result2 = sortFiles(files, "name", "asc");

		expect(result1).toEqual(result2);
	});

	test("functions should not have side effects", () => {
		const files = createTestFiles();
		const originalFiles = files.map((f) => ({ ...f }));

		// 関数を実行
		sortFiles(files, "name", "desc");
		filterFiles(files, (f) => f.size > 100);
		addParentDirectory(files, "/test");

		// 元のデータが変更されていないことを確認
		expect(files).toEqual(originalFiles);
	});

	test("functions should be composable", () => {
		const files = createTestFiles();

		// 関数を組み合わせて使用
		const result = sortFiles(
			filterFiles(excludeHiddenFiles(files), (f) => f.size > 500),
			"size",
			"desc",
		);

		expect(
			result.every(
				(f) => f.size > 500 && (!f.name.startsWith(".") || f.name === ".."),
			),
		).toBe(true);

		// サイズの降順にソートされていることを確認
		const sizes = result.filter((f) => !f.isDirectory).map((f) => f.size);
		for (let i = 0; i < sizes.length - 1; i++) {
			expect(sizes[i]).toBeGreaterThanOrEqual(sizes[i + 1]);
		}
	});
});
