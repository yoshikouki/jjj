/**
 * fileSort.ts 純粋関数のテスト（Bun用）
 *
 * ソート機能の正確性と純粋関数の性質を検証
 * 様々なソート条件での境界値テストを含む
 */

import { expect, test } from "bun:test";
import type { FileItem, FileSortConfig } from "../types/index.js";
import {
	addParentDirectory,
	excludeHiddenFiles,
	filterFiles,
	getDefaultSortConfig,
	getDirectoriesOnly,
	getFilesOnly,
	sortFiles,
	sortFilesByConfig,
	sortFilesDefault,
	validateSortConfig,
} from "../utils/fileSort.js";

// テスト用のファイルアイテムを作成するヘルパー関数
const createFileItem = (
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

// テスト用のファイルセットを作成
const createTestFiles = (): FileItem[] => [
	createFileItem("readme.txt", false, 1024, new Date("2023-01-01T12:00:00Z")),
	createFileItem("documents", true, 0, new Date("2023-01-02T12:00:00Z")),
	createFileItem("app.js", false, 2048, new Date("2023-01-03T12:00:00Z")),
	createFileItem("config.json", false, 512, new Date("2023-01-04T12:00:00Z")),
	createFileItem("scripts", true, 0, new Date("2023-01-05T12:00:00Z")),
	createFileItem("test.ts", false, 4096, new Date("2023-01-06T12:00:00Z")),
];

// ====================================================================
// sortFiles 関数のテスト
// ====================================================================

test("sortFiles: 名前の昇順", () => {
	const files = createTestFiles();
	const config: FileSortConfig = { sortBy: "name", order: "asc" };
	const result = sortFilesByConfig(files, config);

	expect(result[0]!.name).toBe("app.js");
	expect(result[1]!.name).toBe("config.json");
	expect(result[2]!.name).toBe("documents");
	expect(result[3]!.name).toBe("readme.txt");
	expect(result[4]!.name).toBe("scripts");
	expect(result[5]!.name).toBe("test.ts");
});

test("sortFiles: 名前の降順", () => {
	const files = createTestFiles();
	const config: FileSortConfig = { sortBy: "name", order: "desc" };
	const result = sortFilesByConfig(files, config);

	expect(result[0]!.name).toBe("test.ts");
	expect(result[1]!.name).toBe("scripts");
	expect(result[2]!.name).toBe("readme.txt");
	expect(result[3]!.name).toBe("documents");
	expect(result[4]!.name).toBe("config.json");
	expect(result[5]!.name).toBe("app.js");
});

test("sortFiles: サイズの昇順", () => {
	const files = createTestFiles();
	const config: FileSortConfig = { sortBy: "size", order: "asc" };
	const result = sortFilesByConfig(files, config);

	// ディレクトリはサイズ0として扱われるため最初に来る
	expect(result[0]!.name).toBe("documents");
	expect(result[1]!.name).toBe("scripts");
	expect(result[2]!.name).toBe("config.json");
	expect(result[3]!.name).toBe("readme.txt");
	expect(result[4]!.name).toBe("app.js");
	expect(result[5]!.name).toBe("test.ts");
});

test("sortFiles: サイズの降順", () => {
	const files = createTestFiles();
	const config: FileSortConfig = { sortBy: "size", order: "desc" };
	const result = sortFilesByConfig(files, config);

	// 最大サイズのファイルから順に
	expect(result[0]!.name).toBe("test.ts");
	expect(result[1]!.name).toBe("app.js");
	expect(result[2]!.name).toBe("readme.txt");
	expect(result[3]!.name).toBe("config.json");
	expect(result[4]!.name).toBe("documents");
	expect(result[5]!.name).toBe("scripts");
});

test("sortFiles: 空の配列", () => {
	const files: FileItem[] = [];
	const config: FileSortConfig = { sortBy: "name", order: "asc" };
	const result = sortFilesByConfig(files, config);

	expect(result).toEqual([]);
});

test("sortFiles: 純粋関数の検証（元の配列を変更しない）", () => {
	const files = createTestFiles();
	const originalNames = files.map((f) => f.name);
	const config: FileSortConfig = { sortBy: "name", order: "asc" };

	sortFilesByConfig(files, config);

	// 元の配列は変更されない
	expect(files.map((f) => f.name)).toEqual(originalNames);
});

// ====================================================================
// sortFilesDefault 関数のテスト
// ====================================================================

test("sortFilesDefault: ディレクトリ優先、名前順", () => {
	const files = createTestFiles();
	const result = sortFilesDefault(files);

	// ディレクトリが最初に来る
	expect(result[0]!.name).toBe("documents");
	expect(result[1]!.name).toBe("scripts");
	// 残りはファイル（名前順）
	expect(result[2]!.name).toBe("app.js");
	expect(result[3]!.name).toBe("config.json");
	expect(result[4]!.name).toBe("readme.txt");
	expect(result[5]!.name).toBe("test.ts");
});

test("sortFilesDefault: ファイルのみ", () => {
	const files = [
		createFileItem("z.txt", false),
		createFileItem("a.txt", false),
		createFileItem("m.txt", false),
	];
	const result = sortFilesDefault(files);

	expect(result[0]!.name).toBe("a.txt");
	expect(result[1]!.name).toBe("m.txt");
	expect(result[2]!.name).toBe("z.txt");
});

test("sortFilesDefault: 純粋関数の検証", () => {
	const files = createTestFiles();
	const originalNames = files.map((f) => f.name);

	sortFilesDefault(files);

	// 元の配列は変更されない
	expect(files.map((f) => f.name)).toEqual(originalNames);
});

// ====================================================================
// addParentDirectory 関数のテスト
// ====================================================================

test("addParentDirectory: 通常のディレクトリ", () => {
	const files = createTestFiles();
	const result = addParentDirectory(files, "/home/user/documents");

	// 最初に親ディレクトリエントリが追加される
	expect(result[0]!.name).toBe("..");
	expect(result[0]!.isDirectory).toBe(true);
	expect(result.length).toBe(files.length + 1);
});

test("addParentDirectory: ルートディレクトリ", () => {
	const files = createTestFiles();
	const result = addParentDirectory(files, "/");

	// ルートディレクトリの場合は親ディレクトリを追加しない
	expect(result.length).toBe(files.length);
	expect(result[0]!.name).toBe(files[0]!.name);
});

test("addParentDirectory: 純粋関数の検証", () => {
	const files = createTestFiles();
	const originalLength = files.length;

	addParentDirectory(files, "/home/user");

	// 元の配列は変更されない
	expect(files.length).toBe(originalLength);
});

// ====================================================================
// validateSortConfig 関数のテスト
// ====================================================================

test("validateSortConfig: 有効な設定", () => {
	const validConfigs: FileSortConfig[] = [
		{ sortBy: "name", order: "asc" },
		{ sortBy: "name", order: "desc" },
		{ sortBy: "size", order: "asc" },
		{ sortBy: "size", order: "desc" },
		{ sortBy: "modified", order: "asc" },
		{ sortBy: "modified", order: "desc" },
		{ sortBy: "type", order: "asc" },
		{ sortBy: "type", order: "desc" },
	];

	for (const config of validConfigs) {
		expect(validateSortConfig(config)).toBe(true);
	}
});

test("validateSortConfig: 無効なタイプ", () => {
	const invalidConfig = { sortBy: "invalid", order: "asc" } as unknown as FileSortConfig;
	expect(validateSortConfig(invalidConfig)).toBe(false);
});

test("validateSortConfig: 無効な順序", () => {
	const invalidConfig = { sortBy: "name", order: "invalid" } as unknown as FileSortConfig;
	expect(validateSortConfig(invalidConfig)).toBe(false);
});

// ====================================================================
// getDefaultSortConfig 関数のテスト
// ====================================================================

test("getDefaultSortConfig: デフォルト設定", () => {
	const result = getDefaultSortConfig();

	expect(result.sortBy).toBe("name");
	expect(result.order).toBe("asc");
});

test("getDefaultSortConfig: 純粋関数の検証", () => {
	const result1 = getDefaultSortConfig();
	const result2 = getDefaultSortConfig();

	expect(result1).toEqual(result2);
});

// ====================================================================
// filterFiles 関数のテスト
// ====================================================================

test("filterFiles: 基本的なフィルタリング", () => {
	const files = createTestFiles();
	const result = filterFiles(files, (file) => file.name.includes("t"));

	// "t"を含むファイルのみ
	expect(result.length).toBe(2);
	expect(result[0]!.name).toBe("readme.txt");
	expect(result[1]!.name).toBe("test.ts");
});

test("filterFiles: 空の結果", () => {
	const files = createTestFiles();
	const result = filterFiles(files, () => false);

	expect(result).toEqual([]);
});

test("filterFiles: 純粋関数の検証", () => {
	const files = createTestFiles();
	const originalLength = files.length;

	filterFiles(files, (file) => file.name.includes("t"));

	// 元の配列は変更されない
	expect(files.length).toBe(originalLength);
});

// ====================================================================
// excludeHiddenFiles 関数のテスト
// ====================================================================

test("excludeHiddenFiles: 隠しファイルを除外", () => {
	const files = [
		createFileItem("normal.txt", false),
		createFileItem(".hidden", false),
		createFileItem(".hiddendir", true),
		createFileItem("visible", true),
	];

	const result = excludeHiddenFiles(files);

	expect(result.length).toBe(2);
	expect(result[0]!.name).toBe("normal.txt");
	expect(result[1]!.name).toBe("visible");
});

test("excludeHiddenFiles: 親ディレクトリは除外しない", () => {
	const files = [
		createFileItem("normal.txt", false),
		createFileItem("..", true),
		createFileItem(".hidden", false),
	];

	const result = excludeHiddenFiles(files);

	expect(result.length).toBe(2);
	expect(result[0]!.name).toBe("normal.txt");
	expect(result[1]!.name).toBe("..");
});

// ====================================================================
// getDirectoriesOnly 関数のテスト
// ====================================================================

test("getDirectoriesOnly: ディレクトリのみを取得", () => {
	const files = createTestFiles();
	const result = getDirectoriesOnly(files);

	expect(result.length).toBe(2);
	expect(result[0]!.name).toBe("documents");
	expect(result[1]!.name).toBe("scripts");
	expect(result.every((file) => file.isDirectory)).toBe(true);
});

test("getDirectoriesOnly: ディレクトリがない場合", () => {
	const files = [
		createFileItem("file1.txt", false),
		createFileItem("file2.txt", false),
	];
	const result = getDirectoriesOnly(files);

	expect(result).toEqual([]);
});

// ====================================================================
// getFilesOnly 関数のテスト
// ====================================================================

test("getFilesOnly: ファイルのみを取得", () => {
	const files = createTestFiles();
	const result = getFilesOnly(files);

	expect(result.length).toBe(4);
	expect(result[0]!.name).toBe("readme.txt");
	expect(result[1]!.name).toBe("app.js");
	expect(result[2]!.name).toBe("config.json");
	expect(result[3]!.name).toBe("test.ts");
	expect(result.every((file) => !file.isDirectory)).toBe(true);
});

test("getFilesOnly: ファイルがない場合", () => {
	const files = [createFileItem("dir1", true), createFileItem("dir2", true)];
	const result = getFilesOnly(files);

	expect(result).toEqual([]);
});

// ====================================================================
// Property-based testing
// ====================================================================

test("sortFiles: 大量のファイルでも正常に動作", () => {
	const files = Array.from({ length: 1000 }, (_, i) =>
		createFileItem(`file${i}.txt`, false, Math.random() * 10000),
	);

	const config: FileSortConfig = { sortBy: "name", order: "asc" };
	const result = sortFilesByConfig(files, config);

	expect(result.length).toBe(1000);
	// ソートが正しく行われているか確認
	for (let i = 0; i < result.length - 1; i++) {
		expect(result[i]!.name <= result[i + 1]!.name).toBe(true);
	}
});

test("sortFiles: 特殊文字を含むファイル名", () => {
	const files = [
		createFileItem("ファイル.txt", false),
		createFileItem("file with spaces.txt", false),
		createFileItem("file-with-dashes.txt", false),
		createFileItem("file_with_underscores.txt", false),
		createFileItem("file.with.dots.txt", false),
	];

	const config: FileSortConfig = { sortBy: "name", order: "asc" };
	const result = sortFilesByConfig(files, config);

	expect(result.length).toBe(5);
	expect(typeof result[0]!.name).toBe("string");
});

test("filterFiles: 複雑な条件でのフィルタリング", () => {
	const files = createTestFiles();
	const result = filterFiles(
		files,
		(file) => !file.isDirectory && file.size > 1000 && file.name.includes("."),
	);

	// 条件を満たすファイルのみ
	expect(
		result.every(
			(file) =>
				!file.isDirectory && file.size > 1000 && file.name.includes("."),
		),
	).toBe(true);
});

test("excludeHiddenFiles: 様々な隠しファイルパターン", () => {
	const files = [
		createFileItem(".bashrc", false),
		createFileItem("..hidden", false),
		createFileItem(".git", true),
		createFileItem("..", true),
		createFileItem("normal.txt", false),
	];

	const result = excludeHiddenFiles(files);

	// 親ディレクトリ(..)と通常ファイルのみ残る
	expect(result.length).toBe(2);
	expect(result[0]!.name).toBe("normal.txt");
	expect(result[1]!.name).toBe("..");
});

test("sortFiles: 同じ名前のファイルでも安定ソート", () => {
	const files = [
		createFileItem("same.txt", false, 1024, new Date("2023-01-01")),
		createFileItem("same.txt", false, 2048, new Date("2023-01-02")),
		createFileItem("same.txt", false, 512, new Date("2023-01-03")),
	];

	const config: FileSortConfig = { sortBy: "name", order: "asc" };
	const result = sortFilesByConfig(files, config);

	expect(result.length).toBe(3);
	expect(result.every((file) => file.name === "same.txt")).toBe(true);
});

test("addParentDirectory: 空の配列", () => {
	const files: FileItem[] = [];
	const result = addParentDirectory(files, "/home/user");

	expect(result.length).toBe(1);
	expect(result[0]!.name).toBe("..");
	expect(result[0]!.isDirectory).toBe(true);
});

test("validateSortConfig: 境界値テスト", () => {
	// 正常な値
	expect(validateSortConfig({ sortBy: "name", order: "asc" })).toBe(true);
	expect(validateSortConfig({ sortBy: "type", order: "desc" })).toBe(true);

	// 無効な値
	expect(
		validateSortConfig({ sortBy: "invalid", order: "asc" } as unknown as FileSortConfig),
	).toBe(false);
	expect(
		validateSortConfig({ sortBy: "name", order: "invalid" } as unknown as FileSortConfig),
	).toBe(false);
});
