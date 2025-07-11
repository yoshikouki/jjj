/**
 * Tests for file sorting and filtering functions
 * Following Test-First Development approach
 */

import { describe, expect, test } from "bun:test";
import type { FileItem, FilterOptions, SortConfig } from "../../types/index.js";
import {
	calculateFileStats,
	filterFiles,
	findFileIndex,
	getFileAtIndex,
	processFiles,
	sortFiles,
	sortWithDirectoriesFirst,
} from "../fileSort.js";

/**
 * Test data factory
 */
const createTestFile = (overrides: Partial<FileItem>): FileItem => ({
	name: "test.txt",
	path: "/test/test.txt",
	type: "file",
	size: 1000,
	modifiedAt: new Date("2024-01-01"),
	isHidden: false,
	isReadable: true,
	isWritable: true,
	isExecutable: false,
	extension: "txt",
	...overrides,
});

const createTestFiles = (): FileItem[] => [
	createTestFile({
		name: "zebra.txt",
		path: "/test/zebra.txt",
		size: 3000,
		modifiedAt: new Date("2024-01-03"),
	}),
	createTestFile({
		name: "apple.txt",
		path: "/test/apple.txt",
		size: 1000,
		modifiedAt: new Date("2024-01-01"),
	}),
	createTestFile({
		name: "banana.txt",
		path: "/test/banana.txt",
		size: 2000,
		modifiedAt: new Date("2024-01-02"),
	}),
	createTestFile({
		name: "Documents",
		path: "/test/Documents",
		type: "directory",
		size: 4096,
		modifiedAt: new Date("2024-01-05"),
	}),
	createTestFile({
		name: ".hidden",
		path: "/test/.hidden",
		isHidden: true,
		modifiedAt: new Date("2024-01-04"),
	}),
];

describe("sortFiles", () => {
	test("should sort files by name ascending", () => {
		const files = createTestFiles();
		const config: SortConfig = { key: "name", order: "asc" };

		const sorted = sortFiles(files, config);

		expect(sorted[0]!.name).toBe(".hidden");
		expect(sorted[1]!.name).toBe("apple.txt");
		expect(sorted[2]!.name).toBe("banana.txt");
		expect(sorted[3]!.name).toBe("Documents");
		expect(sorted[4]!.name).toBe("zebra.txt");
	});

	test("should sort files by name descending", () => {
		const files = createTestFiles();
		const config: SortConfig = { key: "name", order: "desc" };

		const sorted = sortFiles(files, config);

		expect(sorted[0]!.name).toBe("zebra.txt");
		expect(sorted[4]!.name).toBe(".hidden");
	});

	test("should sort files by size", () => {
		const files = createTestFiles();
		const config: SortConfig = { key: "size", order: "asc" };

		const sorted = sortFiles(files, config);

		expect(sorted[0]!.size).toBe(1000); // apple.txt or .hidden
		expect(sorted[1]!.size).toBe(1000);
		expect(sorted[2]!.size).toBe(2000);
	});

	test("should sort files by modified date", () => {
		const files = createTestFiles();
		const config: SortConfig = { key: "modified", order: "asc" };

		const sorted = sortFiles(files, config);

		expect(sorted[0]!.name).toBe("apple.txt");
		expect(sorted[1]!.name).toBe("banana.txt");
		expect(sorted[2]!.name).toBe("zebra.txt");
	});

	test("should not mutate original array", () => {
		const files = createTestFiles();
		const original = [...files];
		const config: SortConfig = { key: "name", order: "asc" };

		sortFiles(files, config);

		expect(files).toEqual(original);
	});
});

describe("filterFiles", () => {
	test("should filter hidden files", () => {
		const files = createTestFiles();
		const options: FilterOptions = {
			showHidden: false,
			showDirectoriesFirst: false,
		};

		const filtered = filterFiles(files, options);

		expect(filtered.length).toBe(4);
		expect(filtered.every((f) => !f.isHidden)).toBe(true);
	});

	test("should show hidden files when enabled", () => {
		const files = createTestFiles();
		const options: FilterOptions = {
			showHidden: true,
			showDirectoriesFirst: false,
		};

		const filtered = filterFiles(files, options);

		expect(filtered.length).toBe(5);
	});

	test("should filter by extensions", () => {
		const files = createTestFiles();
		const options: FilterOptions = {
			showHidden: true,
			showDirectoriesFirst: false,
			extensions: ["txt"],
		};

		const filtered = filterFiles(files, options);

		expect(filtered.length).toBe(5); // 3 txt files + 1 directory + 1 hidden
		expect(
			filtered
				.filter((f) => f.type === "file")
				.every((f) => f.extension === "txt"),
		).toBe(true);
	});

	test("should filter by search query", () => {
		const files = createTestFiles();
		const options: FilterOptions = {
			showHidden: true,
			showDirectoriesFirst: false,
			searchQuery: "ban",
		};

		const filtered = filterFiles(files, options);

		expect(filtered.length).toBe(1);
		expect(filtered[0]!.name).toBe("banana.txt");
	});

	test("should be case-insensitive for search", () => {
		const files = createTestFiles();
		const options: FilterOptions = {
			showHidden: true,
			showDirectoriesFirst: false,
			searchQuery: "APPLE",
		};

		const filtered = filterFiles(files, options);

		expect(filtered.length).toBe(1);
		expect(filtered[0]!.name).toBe("apple.txt");
	});
});

describe("sortWithDirectoriesFirst", () => {
	test("should place directories first when enabled", () => {
		const files = createTestFiles();

		const sorted = sortWithDirectoriesFirst(files, true);

		expect(sorted[0]!.type).toBe("directory");
		expect(sorted.slice(1).every((f) => f.type !== "directory")).toBe(true);
	});

	test("should not change order when disabled", () => {
		const files = createTestFiles();

		const sorted = sortWithDirectoriesFirst(files, false);

		expect(sorted).toEqual(files);
	});
});

describe("processFiles", () => {
	test("should apply all operations in correct order", () => {
		const files = createTestFiles();
		const sortConfig: SortConfig = { key: "name", order: "asc" };
		const filterOptions: FilterOptions = {
			showHidden: false,
			showDirectoriesFirst: true,
		};

		const processed = processFiles(files, sortConfig, filterOptions);

		// Should have directory first
		expect(processed[0]!.type).toBe("directory");
		// Should not have hidden files
		expect(processed.every((f) => !f.isHidden)).toBe(true);
		// Should be sorted by name
		expect(processed[1]!.name).toBe("apple.txt");
	});
});

describe("calculateFileStats", () => {
	test("should calculate correct statistics", () => {
		const files = createTestFiles();

		const stats = calculateFileStats(files);

		expect(stats.totalCount).toBe(5);
		expect(stats.fileCount).toBe(4);
		expect(stats.directoryCount).toBe(1);
		expect(stats.totalSize).toBe(11096); // 1000 + 2000 + 3000 + 4096 + 1000
		expect(stats.hiddenCount).toBe(1);
	});

	test("should handle empty array", () => {
		const stats = calculateFileStats([]);

		expect(stats.totalCount).toBe(0);
		expect(stats.fileCount).toBe(0);
		expect(stats.directoryCount).toBe(0);
		expect(stats.totalSize).toBe(0);
		expect(stats.hiddenCount).toBe(0);
	});
});

describe("getFileAtIndex", () => {
	test("should return file at valid index", () => {
		const files = createTestFiles();

		const file = getFileAtIndex(files, 1);

		expect(file?.name).toBe("apple.txt");
	});

	test("should return undefined for negative index", () => {
		const files = createTestFiles();

		const file = getFileAtIndex(files, -1);

		expect(file).toBeUndefined();
	});

	test("should return undefined for out of bounds index", () => {
		const files = createTestFiles();

		const file = getFileAtIndex(files, 10);

		expect(file).toBeUndefined();
	});
});

describe("findFileIndex", () => {
	test("should find index of existing file", () => {
		const files = createTestFiles();

		const index = findFileIndex(files, "/test/apple.txt");

		expect(index).toBe(1);
	});

	test("should return -1 for non-existent file", () => {
		const files = createTestFiles();

		const index = findFileIndex(files, "/test/notfound.txt");

		expect(index).toBe(-1);
	});
});
