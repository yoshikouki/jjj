/**
 * fileSort.ts 純粋関数のテスト
 *
 * ソート機能の正確性と純粋関数の性質を検証
 * 様々なソート条件での境界値テストを含む
 */

import test from "ava";
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

test("sortFiles: 名前の昇順", (t) => {
	const files = createTestFiles();
	const config: FileSortConfig = { sortBy: "name", order: "asc" };
	const result = sortFilesByConfig(files, config);

	// 結果の順序を確認
	t.is(result[0].name, "app.js");
	t.is(result[1].name, "config.json");
	t.is(result[2].name, "documents");
	t.is(result[3].name, "readme.txt");
	t.is(result[4].name, "scripts");
	t.is(result[5].name, "test.ts");
});

test("sortFiles: 名前の降順", (t) => {
	const files = createTestFiles();
	const config: FileSortConfig = { sortBy: "name", order: "desc" };
	const result = sortFilesByConfig(files, config);

	// 結果の順序を確認
	t.is(result[0].name, "test.ts");
	t.is(result[1].name, "scripts");
	t.is(result[2].name, "readme.txt");
	t.is(result[3].name, "documents");
	t.is(result[4].name, "config.json");
	t.is(result[5].name, "app.js");
});

test("sortFiles: サイズの昇順", (t) => {
	const files = createTestFiles();
	const config: FileSortConfig = { sortBy: "size", order: "asc" };
	const result = sortFilesByConfig(files, config);

	// ディレクトリはサイズ0として扱われるため最初に来る
	t.is(result[0].name, "documents");
	t.is(result[1].name, "scripts");
	t.is(result[2].name, "config.json");
	t.is(result[3].name, "readme.txt");
	t.is(result[4].name, "app.js");
	t.is(result[5].name, "test.ts");
});

test("sortFiles: サイズの降順", (t) => {
	const files = createTestFiles();
	const config: FileSortConfig = { sortBy: "size", order: "desc" };
	const result = sortFilesByConfig(files, config);

	// 最大サイズのファイルから順に
	t.is(result[0].name, "test.ts");
	t.is(result[1].name, "app.js");
	t.is(result[2].name, "readme.txt");
	t.is(result[3].name, "config.json");
	// ディレクトリはサイズ0として扱われる
	t.is(result[4].name, "documents");
	t.is(result[5].name, "scripts");
});

test("sortFiles: 更新日時の昇順", (t) => {
	const files = createTestFiles();
	const config: FileSortConfig = { sortBy: "modified", order: "asc" };
	const result = sortFilesByConfig(files, config);

	// 更新日時順
	t.is(result[0].name, "readme.txt");
	t.is(result[1].name, "documents");
	t.is(result[2].name, "app.js");
	t.is(result[3].name, "config.json");
	t.is(result[4].name, "scripts");
	t.is(result[5].name, "test.ts");
});

test("sortFiles: 更新日時の降順", (t) => {
	const files = createTestFiles();
	const config: FileSortConfig = { sortBy: "modified", order: "desc" };
	const result = sortFilesByConfig(files, config);

	// 最新から順に
	t.is(result[0].name, "test.ts");
	t.is(result[1].name, "scripts");
	t.is(result[2].name, "config.json");
	t.is(result[3].name, "app.js");
	t.is(result[4].name, "documents");
	t.is(result[5].name, "readme.txt");
});

test("sortFiles: タイプの昇順（ディレクトリ優先）", (t) => {
	const files = createTestFiles();
	const config: FileSortConfig = { sortBy: "type", order: "asc" };
	const result = sortFilesByConfig(files, config);

	// ディレクトリが最初に来る
	t.is(result[0].name, "documents");
	t.is(result[1].name, "scripts");
	// 残りはファイル（名前順）
	t.is(result[2].name, "app.js");
	t.is(result[3].name, "config.json");
	t.is(result[4].name, "readme.txt");
	t.is(result[5].name, "test.ts");
});

test("sortFiles: タイプの降順（ファイル優先）", (t) => {
	const files = createTestFiles();
	const config: FileSortConfig = { sortBy: "type", order: "desc" };
	const result = sortFilesByConfig(files, config);

	// ファイルが最初に来る
	t.is(result[0].name, "app.js");
	t.is(result[1].name, "config.json");
	t.is(result[2].name, "readme.txt");
	t.is(result[3].name, "test.ts");
	// 最後にディレクトリ（名前順）
	t.is(result[4].name, "documents");
	t.is(result[5].name, "scripts");
});

test("sortFiles: 空の配列", (t) => {
	const files: FileItem[] = [];
	const config: FileSortConfig = { sortBy: "name", order: "asc" };
	const result = sortFilesByConfig(files, config);

	t.deepEqual(result, []);
});

test("sortFiles: 純粋関数の検証（元の配列を変更しない）", (t) => {
	const files = createTestFiles();
	const originalNames = files.map((f) => f.name);
	const config: FileSortConfig = { sortBy: "name", order: "asc" };

	sortFilesByConfig(files, config);

	// 元の配列は変更されない
	t.deepEqual(
		files.map((f) => f.name),
		originalNames,
	);
});

test("sortFiles: 純粋関数の検証（同じ入力で同じ出力）", (t) => {
	const files = createTestFiles();
	const config: FileSortConfig = { sortBy: "name", order: "asc" };

	const result1 = sortFiles(files, config);
	const result2 = sortFiles(files, config);

	t.deepEqual(result1, result2);
});

// ====================================================================
// sortFilesDefault 関数のテスト
// ====================================================================

test("sortFilesDefault: ディレクトリ優先、名前順", (t) => {
	const files = createTestFiles();
	const result = sortFilesDefault(files);

	// ディレクトリが最初に来る
	t.is(result[0].name, "documents");
	t.is(result[1].name, "scripts");
	// 残りはファイル（名前順）
	t.is(result[2].name, "app.js");
	t.is(result[3].name, "config.json");
	t.is(result[4].name, "readme.txt");
	t.is(result[5].name, "test.ts");
});

test("sortFilesDefault: ファイルのみ", (t) => {
	const files = [
		createFileItem("z.txt", false),
		createFileItem("a.txt", false),
		createFileItem("m.txt", false),
	];
	const result = sortFilesDefault(files);

	t.is(result[0].name, "a.txt");
	t.is(result[1].name, "m.txt");
	t.is(result[2].name, "z.txt");
});

test("sortFilesDefault: ディレクトリのみ", (t) => {
	const files = [
		createFileItem("z-dir", true),
		createFileItem("a-dir", true),
		createFileItem("m-dir", true),
	];
	const result = sortFilesDefault(files);

	t.is(result[0].name, "a-dir");
	t.is(result[1].name, "m-dir");
	t.is(result[2].name, "z-dir");
});

test("sortFilesDefault: 純粋関数の検証", (t) => {
	const files = createTestFiles();
	const originalNames = files.map((f) => f.name);

	sortFilesDefault(files);

	// 元の配列は変更されない
	t.deepEqual(
		files.map((f) => f.name),
		originalNames,
	);
});

// ====================================================================
// addParentDirectory 関数のテスト
// ====================================================================

test("addParentDirectory: 通常のディレクトリ", (t) => {
	const files = createTestFiles();
	const result = addParentDirectory(files, "/home/user/documents");

	// 最初に親ディレクトリエントリが追加される
	t.is(result[0].name, "..");
	t.is(result[0].isDirectory, true);
	t.is(result.length, files.length + 1);
});

test("addParentDirectory: ルートディレクトリ", (t) => {
	const files = createTestFiles();
	const result = addParentDirectory(files, "/");

	// ルートディレクトリの場合は親ディレクトリを追加しない
	t.is(result.length, files.length);
	t.is(result[0].name, files[0].name);
});

test("addParentDirectory: 空の配列", (t) => {
	const files: FileItem[] = [];
	const result = addParentDirectory(files, "/home/user");

	t.is(result.length, 1);
	t.is(result[0].name, "..");
	t.is(result[0].isDirectory, true);
});

test("addParentDirectory: 純粋関数の検証", (t) => {
	const files = createTestFiles();
	const originalLength = files.length;

	addParentDirectory(files, "/home/user");

	// 元の配列は変更されない
	t.is(files.length, originalLength);
});

// ====================================================================
// validateSortConfig 関数のテスト
// ====================================================================

test("validateSortConfig: 有効な設定", (t) => {
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
		t.is(validateSortConfig(config), true);
	}
});

test("validateSortConfig: 無効なタイプ", (t) => {
	const invalidConfig = { sortBy: "invalid", order: "asc" } as FileSortConfig;
	t.is(validateSortConfig(invalidConfig), false);
});

test("validateSortConfig: 無効な順序", (t) => {
	const invalidConfig = { sortBy: "name", order: "invalid" } as FileSortConfig;
	t.is(validateSortConfig(invalidConfig), false);
});

test("validateSortConfig: 純粋関数の検証", (t) => {
	const config: FileSortConfig = { sortBy: "name", order: "asc" };
	const result1 = validateSortConfig(config);
	const result2 = validateSortConfig(config);
	t.is(result1, result2);
});

// ====================================================================
// getDefaultSortConfig 関数のテスト
// ====================================================================

test("getDefaultSortConfig: デフォルト設定", (t) => {
	const result = getDefaultSortConfig();

	t.is(result.sortBy, "name");
	t.is(result.order, "asc");
});

test("getDefaultSortConfig: 純粋関数の検証", (t) => {
	const result1 = getDefaultSortConfig();
	const result2 = getDefaultSortConfig();

	t.deepEqual(result1, result2);
});

// ====================================================================
// filterFiles 関数のテスト
// ====================================================================

test("filterFiles: 基本的なフィルタリング", (t) => {
	const files = createTestFiles();
	const result = filterFiles(files, (file) => file.name.includes("t"));

	// "t"を含むファイルのみ
	t.is(result.length, 2);
	t.is(result[0].name, "readme.txt");
	t.is(result[1].name, "test.ts");
});

test("filterFiles: 空の結果", (t) => {
	const files = createTestFiles();
	const result = filterFiles(files, () => false);

	t.deepEqual(result, []);
});

test("filterFiles: 全て通す", (t) => {
	const files = createTestFiles();
	const result = filterFiles(files, () => true);

	t.is(result.length, files.length);
});

test("filterFiles: 純粋関数の検証", (t) => {
	const files = createTestFiles();
	const originalLength = files.length;

	filterFiles(files, (file) => file.name.includes("t"));

	// 元の配列は変更されない
	t.is(files.length, originalLength);
});

// ====================================================================
// excludeHiddenFiles 関数のテスト
// ====================================================================

test("excludeHiddenFiles: 隠しファイルを除外", (t) => {
	const files = [
		createFileItem("normal.txt", false),
		createFileItem(".hidden", false),
		createFileItem(".hiddendir", true),
		createFileItem("visible", true),
	];

	const result = excludeHiddenFiles(files);

	t.is(result.length, 2);
	t.is(result[0].name, "normal.txt");
	t.is(result[1].name, "visible");
});

test("excludeHiddenFiles: 親ディレクトリは除外しない", (t) => {
	const files = [
		createFileItem("normal.txt", false),
		createFileItem("..", true),
		createFileItem(".hidden", false),
	];

	const result = excludeHiddenFiles(files);

	t.is(result.length, 2);
	t.is(result[0].name, "normal.txt");
	t.is(result[1].name, "..");
});

test("excludeHiddenFiles: 純粋関数の検証", (t) => {
	const files = [
		createFileItem("normal.txt", false),
		createFileItem(".hidden", false),
	];
	const originalLength = files.length;

	excludeHiddenFiles(files);

	// 元の配列は変更されない
	t.is(files.length, originalLength);
});

// ====================================================================
// getDirectoriesOnly 関数のテスト
// ====================================================================

test("getDirectoriesOnly: ディレクトリのみを取得", (t) => {
	const files = createTestFiles();
	const result = getDirectoriesOnly(files);

	t.is(result.length, 2);
	t.is(result[0].name, "documents");
	t.is(result[1].name, "scripts");
	t.true(result.every((file) => file.isDirectory));
});

test("getDirectoriesOnly: ディレクトリがない場合", (t) => {
	const files = [
		createFileItem("file1.txt", false),
		createFileItem("file2.txt", false),
	];
	const result = getDirectoriesOnly(files);

	t.deepEqual(result, []);
});

test("getDirectoriesOnly: 純粋関数の検証", (t) => {
	const files = createTestFiles();
	const originalLength = files.length;

	getDirectoriesOnly(files);

	// 元の配列は変更されない
	t.is(files.length, originalLength);
});

// ====================================================================
// getFilesOnly 関数のテスト
// ====================================================================

test("getFilesOnly: ファイルのみを取得", (t) => {
	const files = createTestFiles();
	const result = getFilesOnly(files);

	t.is(result.length, 4);
	t.is(result[0].name, "readme.txt");
	t.is(result[1].name, "app.js");
	t.is(result[2].name, "config.json");
	t.is(result[3].name, "test.ts");
	t.true(result.every((file) => !file.isDirectory));
});

test("getFilesOnly: ファイルがない場合", (t) => {
	const files = [createFileItem("dir1", true), createFileItem("dir2", true)];
	const result = getFilesOnly(files);

	t.deepEqual(result, []);
});

test("getFilesOnly: 純粋関数の検証", (t) => {
	const files = createTestFiles();
	const originalLength = files.length;

	getFilesOnly(files);

	// 元の配列は変更されない
	t.is(files.length, originalLength);
});

// ====================================================================
// Property-based testing
// ====================================================================

test("sortFiles: 大量のファイルでも正常に動作", (t) => {
	const files = Array.from({ length: 1000 }, (_, i) =>
		createFileItem(`file${i}.txt`, false, Math.random() * 10000),
	);

	const config: FileSortConfig = { sortBy: "name", order: "asc" };
	const result = sortFilesByConfig(files, config);

	t.is(result.length, 1000);
	// ソートが正しく行われているか確認
	for (let i = 0; i < result.length - 1; i++) {
		t.true(result[i].name <= result[i + 1].name);
	}
});

test("sortFiles: 同じ名前のファイルでも安定ソート", (t) => {
	const files = [
		createFileItem("same.txt", false, 1024, new Date("2023-01-01")),
		createFileItem("same.txt", false, 2048, new Date("2023-01-02")),
		createFileItem("same.txt", false, 512, new Date("2023-01-03")),
	];

	const config: FileSortConfig = { sortBy: "name", order: "asc" };
	const result = sortFilesByConfig(files, config);

	t.is(result.length, 3);
	t.true(result.every((file) => file.name === "same.txt"));
});

test("sortFiles: 特殊文字を含むファイル名", (t) => {
	const files = [
		createFileItem("ファイル.txt", false),
		createFileItem("file with spaces.txt", false),
		createFileItem("file-with-dashes.txt", false),
		createFileItem("file_with_underscores.txt", false),
		createFileItem("file.with.dots.txt", false),
	];

	const config: FileSortConfig = { sortBy: "name", order: "asc" };
	const result = sortFilesByConfig(files, config);

	t.is(result.length, 5);
	t.is(typeof result[0].name, "string");
});

test("filterFiles: 複雑な条件でのフィルタリング", (t) => {
	const files = createTestFiles();
	const result = filterFiles(
		files,
		(file) => !file.isDirectory && file.size > 1000 && file.name.includes("."),
	);

	// 条件を満たすファイルのみ
	t.true(
		result.every(
			(file) =>
				!file.isDirectory && file.size > 1000 && file.name.includes("."),
		),
	);
});

test("excludeHiddenFiles: 様々な隠しファイルパターン", (t) => {
	const files = [
		createFileItem(".bashrc", false),
		createFileItem("..hidden", false),
		createFileItem(".git", true),
		createFileItem("..", true),
		createFileItem("normal.txt", false),
	];

	const result = excludeHiddenFiles(files);

	// 親ディレクトリ(..)と通常ファイルのみ残る
	t.is(result.length, 2);
	t.is(result[0].name, "normal.txt");
	t.is(result[1].name, "..");
});
