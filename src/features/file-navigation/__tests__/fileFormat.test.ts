/**
 * fileFormat.ts 純粋関数のテスト
 *
 * 全ての関数が純粋関数であることを確認し、
 * 境界値やエラーケースを含む包括的なテストを実装
 */

import test from "ava";
import type { DisplayConfig, FileItem, TerminalSize } from "../types/index.js";
import {
	calculateTotalSize,
	countFileTypes,
	formatAbsoluteDate,
	formatFileDisplay,
	formatFileSize,
	formatRelativeDate,
	formatScrollIndicator,
	getDefaultDisplayConfig,
	getFileIcon,
	truncateFileName,
	truncatePath,
} from "../utils/fileFormat.js";

// テスト用のファイルアイテム
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

// テスト用のターミナルサイズ
const createTerminalSize = (width: number, height: number): TerminalSize => ({
	width,
	height,
});

// テスト用の表示設定
const createDisplayConfig = (
	terminalSize: TerminalSize,
	showFileSize: boolean = true,
	showModifiedDate: boolean = true,
	maxFileNameLength: number = 50,
): DisplayConfig => ({
	terminalSize,
	showFileSize,
	showModifiedDate,
	maxFileNameLength,
});

// ====================================================================
// formatFileSize 関数のテスト
// ====================================================================

test("formatFileSize: 0バイトの場合", (t) => {
	const result = formatFileSize(0);
	t.is(result, "0 B");
});

test("formatFileSize: 1バイトの場合", (t) => {
	const result = formatFileSize(1);
	t.is(result, "1 B");
});

test("formatFileSize: 1023バイトの場合", (t) => {
	const result = formatFileSize(1023);
	t.is(result, "1023 B");
});

test("formatFileSize: 1024バイト（1KB）の場合", (t) => {
	const result = formatFileSize(1024);
	t.is(result, "1.0 KB");
});

test("formatFileSize: 1536バイト（1.5KB）の場合", (t) => {
	const result = formatFileSize(1536);
	t.is(result, "1.5 KB");
});

test("formatFileSize: 1MBの場合", (t) => {
	const result = formatFileSize(1024 * 1024);
	t.is(result, "1.0 MB");
});

test("formatFileSize: 1GBの場合", (t) => {
	const result = formatFileSize(1024 * 1024 * 1024);
	t.is(result, "1.0 GB");
});

test("formatFileSize: 1TBの場合", (t) => {
	const result = formatFileSize(1024 * 1024 * 1024 * 1024);
	t.is(result, "1.0 TB");
});

test("formatFileSize: 非整数のバイト数", (t) => {
	const result = formatFileSize(1536.5);
	t.is(result, "1.5 KB");
});

test("formatFileSize: 同じ入力に対して同じ出力（純粋関数）", (t) => {
	const bytes = 2048;
	const result1 = formatFileSize(bytes);
	const result2 = formatFileSize(bytes);
	t.is(result1, result2);
});

// ====================================================================
// truncateFileName 関数のテスト
// ====================================================================

test("truncateFileName: 短いファイル名はそのまま", (t) => {
	const result = truncateFileName("test.txt", 100);
	t.is(result, "test.txt");
});

test("truncateFileName: 長いファイル名は省略", (t) => {
	const longName = `${"a".repeat(100)}.txt`;
	const result = truncateFileName(longName, 50);
	t.true(result.includes("..."));
	t.true(result.endsWith(".txt"));
});

test("truncateFileName: 拡張子なしのファイル名", (t) => {
	const longName = "a".repeat(100);
	const result = truncateFileName(longName, 50);
	t.true(result.includes("..."));
	t.true(result.length <= 50 - 25); // 予約領域を考慮
});

test("truncateFileName: 最小のターミナル幅", (t) => {
	const result = truncateFileName("verylongfilename.txt", 30);
	t.true(result.length <= 30 - 25); // 予約領域を考慮
});

test("truncateFileName: 空のファイル名", (t) => {
	const result = truncateFileName("", 100);
	t.is(result, "");
});

test("truncateFileName: 拡張子が長い場合", (t) => {
	const result = truncateFileName("test.verylongextension", 50);
	t.true(result.includes("..."));
	t.true(result.endsWith(".verylongextension"));
});

test("truncateFileName: 純粋関数の検証", (t) => {
	const name = "testfile.txt";
	const width = 80;
	const result1 = truncateFileName(name, width);
	const result2 = truncateFileName(name, width);
	t.is(result1, result2);
});

// ====================================================================
// formatRelativeDate 関数のテスト
// ====================================================================

test("formatRelativeDate: 現在時刻", (t) => {
	const now = new Date();
	const result = formatRelativeDate(now, now);
	t.is(result, "just now");
});

test("formatRelativeDate: 1分前", (t) => {
	const now = new Date();
	const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
	const result = formatRelativeDate(oneMinuteAgo, now);
	t.is(result, "1m ago");
});

test("formatRelativeDate: 30分前", (t) => {
	const now = new Date();
	const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
	const result = formatRelativeDate(thirtyMinutesAgo, now);
	t.is(result, "30m ago");
});

test("formatRelativeDate: 1時間前", (t) => {
	const now = new Date();
	const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
	const result = formatRelativeDate(oneHourAgo, now);
	t.is(result, "1h ago");
});

test("formatRelativeDate: 1日前", (t) => {
	const now = new Date();
	const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const result = formatRelativeDate(oneDayAgo, now);
	t.is(result, "1d ago");
});

test("formatRelativeDate: 7日前", (t) => {
	const now = new Date();
	const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	const result = formatRelativeDate(sevenDaysAgo, now);
	t.is(result, "7d ago");
});

test("formatRelativeDate: 8日前（絶対日付）", (t) => {
	const now = new Date();
	const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
	const result = formatRelativeDate(eightDaysAgo, now);
	t.is(result, eightDaysAgo.toLocaleDateString());
});

test("formatRelativeDate: 未来の日付", (t) => {
	const now = new Date();
	const future = new Date(now.getTime() + 60 * 1000);
	const result = formatRelativeDate(future, now);
	t.is(result, "just now"); // 負の値は0未満として扱われる
});

test("formatRelativeDate: 純粋関数の検証", (t) => {
	const date = new Date("2023-01-01T12:00:00Z");
	const now = new Date("2023-01-01T13:00:00Z");
	const result1 = formatRelativeDate(date, now);
	const result2 = formatRelativeDate(date, now);
	t.is(result1, result2);
});

// ====================================================================
// formatAbsoluteDate 関数のテスト
// ====================================================================

test("formatAbsoluteDate: 正常な日付", (t) => {
	const date = new Date("2023-01-01T12:00:00Z");
	const result = formatAbsoluteDate(date);
	t.true(result.includes("2023"));
	t.true(result.includes("01"));
	t.true(result.includes("12"));
});

test("formatAbsoluteDate: 純粋関数の検証", (t) => {
	const date = new Date("2023-01-01T12:00:00Z");
	const result1 = formatAbsoluteDate(date);
	const result2 = formatAbsoluteDate(date);
	t.is(result1, result2);
});

// ====================================================================
// getFileIcon 関数のテスト
// ====================================================================

test("getFileIcon: ディレクトリ", (t) => {
	const file = createFileItem("test", true);
	const result = getFileIcon(file);
	t.is(result, "📁");
});

test("getFileIcon: 親ディレクトリ", (t) => {
	const file = createFileItem("..", true);
	const result = getFileIcon(file);
	t.is(result, "📁");
});

test("getFileIcon: JavaScript ファイル", (t) => {
	const file = createFileItem("test.js", false);
	const result = getFileIcon(file);
	t.is(result, "📜");
});

test("getFileIcon: TypeScript ファイル", (t) => {
	const file = createFileItem("test.ts", false);
	const result = getFileIcon(file);
	t.is(result, "📜");
});

test("getFileIcon: JSON ファイル", (t) => {
	const file = createFileItem("test.json", false);
	const result = getFileIcon(file);
	t.is(result, "📋");
});

test("getFileIcon: Markdown ファイル", (t) => {
	const file = createFileItem("test.md", false);
	const result = getFileIcon(file);
	t.is(result, "📄");
});

test("getFileIcon: 画像ファイル", (t) => {
	const file = createFileItem("test.png", false);
	const result = getFileIcon(file);
	t.is(result, "🖼️");
});

test("getFileIcon: PDF ファイル", (t) => {
	const file = createFileItem("test.pdf", false);
	const result = getFileIcon(file);
	t.is(result, "📕");
});

test("getFileIcon: 圧縮ファイル", (t) => {
	const file = createFileItem("test.zip", false);
	const result = getFileIcon(file);
	t.is(result, "📦");
});

test("getFileIcon: 実行ファイル", (t) => {
	const file = createFileItem("test.exe", false);
	const result = getFileIcon(file);
	t.is(result, "⚙️");
});

test("getFileIcon: 不明な拡張子", (t) => {
	const file = createFileItem("test.unknown", false);
	const result = getFileIcon(file);
	t.is(result, "📄");
});

test("getFileIcon: 拡張子なし", (t) => {
	const file = createFileItem("test", false);
	const result = getFileIcon(file);
	t.is(result, "📄");
});

test("getFileIcon: 大文字の拡張子", (t) => {
	const file = createFileItem("test.JS", false);
	const result = getFileIcon(file);
	t.is(result, "📜");
});

test("getFileIcon: 純粋関数の検証", (t) => {
	const file = createFileItem("test.js", false);
	const result1 = getFileIcon(file);
	const result2 = getFileIcon(file);
	t.is(result1, result2);
});

// ====================================================================
// formatFileDisplay 関数のテスト
// ====================================================================

test("formatFileDisplay: 基本的な表示", (t) => {
	const file = createFileItem("test.txt", false);
	const config = createDisplayConfig(createTerminalSize(100, 30));
	const result = formatFileDisplay(file, config);

	t.true(result.includes("📄"));
	t.true(result.includes("test.txt"));
	t.true(result.includes("1.0 KB"));
});

test("formatFileDisplay: ディレクトリ", (t) => {
	const file = createFileItem("testdir", true);
	const config = createDisplayConfig(createTerminalSize(100, 30));
	const result = formatFileDisplay(file, config);

	t.true(result.includes("📁"));
	t.true(result.includes("testdir"));
	t.false(result.includes("KB")); // ディレクトリはサイズ表示なし
});

test("formatFileDisplay: 狭いターミナルでサイズ非表示", (t) => {
	const file = createFileItem("test.txt", false);
	const config = createDisplayConfig(createTerminalSize(50, 30));
	const result = formatFileDisplay(file, config);

	t.true(result.includes("📄"));
	t.true(result.includes("test.txt"));
	t.false(result.includes("KB"));
});

test("formatFileDisplay: 幅広ターミナルで日付表示", (t) => {
	const file = createFileItem("test.txt", false);
	const config = createDisplayConfig(createTerminalSize(100, 30));
	const result = formatFileDisplay(file, config);

	t.true(result.includes("📄"));
	t.true(result.includes("test.txt"));
	t.true(result.includes("ago") || result.includes("just now"));
});

test("formatFileDisplay: 純粋関数の検証", (t) => {
	const file = createFileItem("test.txt", false);
	const config = createDisplayConfig(createTerminalSize(100, 30));
	const result1 = formatFileDisplay(file, config);
	const result2 = formatFileDisplay(file, config);
	t.is(result1, result2);
});

// ====================================================================
// truncatePath 関数のテスト
// ====================================================================

test("truncatePath: 短いパス", (t) => {
	const path = "/home/user/test";
	const result = truncatePath(path, 100);
	t.is(result, path);
});

test("truncatePath: 長いパス", (t) => {
	const path = "/very/long/path/with/many/segments/test";
	const result = truncatePath(path, 30);
	t.true(result.includes("..."));
	t.true(result.length <= 30 - 10); // 予約領域を考慮
});

test("truncatePath: ホームディレクトリの短縮", (t) => {
	const path = "/home/user/documents/test";
	const result = truncatePath(path, 100);
	t.true(result.includes("~"));
	t.false(result.includes("user"));
});

test("truncatePath: 純粋関数の検証", (t) => {
	const path = "/home/user/test";
	const width = 80;
	const result1 = truncatePath(path, width);
	const result2 = truncatePath(path, width);
	t.is(result1, result2);
});

// ====================================================================
// formatScrollIndicator 関数のテスト
// ====================================================================

test("formatScrollIndicator: 基本的な表示", (t) => {
	const result = formatScrollIndicator(0, 10, 20);
	t.is(result, "1-10 of 20");
});

test("formatScrollIndicator: 上にスクロール可能", (t) => {
	const result = formatScrollIndicator(5, 15, 20);
	t.is(result, "↑ 6-15 of 20");
});

test("formatScrollIndicator: 下にスクロール可能", (t) => {
	const result = formatScrollIndicator(0, 10, 20);
	t.is(result, "1-10 of 20 ↓");
});

test("formatScrollIndicator: 上下にスクロール可能", (t) => {
	const result = formatScrollIndicator(5, 15, 20);
	t.is(result, "↑ 6-15 of 20 ↓");
});

test("formatScrollIndicator: 全て表示", (t) => {
	const result = formatScrollIndicator(0, 10, 10);
	t.is(result, "1-10 of 10");
});

test("formatScrollIndicator: 純粋関数の検証", (t) => {
	const result1 = formatScrollIndicator(0, 10, 20);
	const result2 = formatScrollIndicator(0, 10, 20);
	t.is(result1, result2);
});

// ====================================================================
// getDefaultDisplayConfig 関数のテスト
// ====================================================================

test("getDefaultDisplayConfig: 基本的な設定", (t) => {
	const terminalSize = createTerminalSize(100, 30);
	const result = getDefaultDisplayConfig(terminalSize);

	t.deepEqual(result.terminalSize, terminalSize);
	t.is(result.showFileSize, true);
	t.is(result.showModifiedDate, true);
	t.is(result.maxFileNameLength, 75);
});

test("getDefaultDisplayConfig: 狭いターミナル", (t) => {
	const terminalSize = createTerminalSize(50, 30);
	const result = getDefaultDisplayConfig(terminalSize);

	t.is(result.showFileSize, false);
	t.is(result.showModifiedDate, false);
	t.is(result.maxFileNameLength, 25);
});

test("getDefaultDisplayConfig: 純粋関数の検証", (t) => {
	const terminalSize = createTerminalSize(100, 30);
	const result1 = getDefaultDisplayConfig(terminalSize);
	const result2 = getDefaultDisplayConfig(terminalSize);
	t.deepEqual(result1, result2);
});

// ====================================================================
// calculateTotalSize 関数のテスト
// ====================================================================

test("calculateTotalSize: 空の配列", (t) => {
	const result = calculateTotalSize([]);
	t.is(result, 0);
});

test("calculateTotalSize: ファイルのみ", (t) => {
	const files = [
		createFileItem("file1.txt", false, 1024),
		createFileItem("file2.txt", false, 2048),
	];
	const result = calculateTotalSize(files);
	t.is(result, 3072);
});

test("calculateTotalSize: ディレクトリは除外", (t) => {
	const files = [
		createFileItem("file1.txt", false, 1024),
		createFileItem("dir1", true, 0),
		createFileItem("file2.txt", false, 2048),
	];
	const result = calculateTotalSize(files);
	t.is(result, 3072);
});

test("calculateTotalSize: 純粋関数の検証", (t) => {
	const files = [
		createFileItem("file1.txt", false, 1024),
		createFileItem("file2.txt", false, 2048),
	];
	const result1 = calculateTotalSize(files);
	const result2 = calculateTotalSize(files);
	t.is(result1, result2);
});

// ====================================================================
// countFileTypes 関数のテスト
// ====================================================================

test("countFileTypes: 空の配列", (t) => {
	const result = countFileTypes([]);
	t.deepEqual(result, { files: 0, directories: 0 });
});

test("countFileTypes: ファイルとディレクトリ", (t) => {
	const files = [
		createFileItem("file1.txt", false),
		createFileItem("dir1", true),
		createFileItem("file2.txt", false),
		createFileItem("dir2", true),
	];
	const result = countFileTypes(files);
	t.deepEqual(result, { files: 2, directories: 2 });
});

test("countFileTypes: ファイルのみ", (t) => {
	const files = [
		createFileItem("file1.txt", false),
		createFileItem("file2.txt", false),
	];
	const result = countFileTypes(files);
	t.deepEqual(result, { files: 2, directories: 0 });
});

test("countFileTypes: ディレクトリのみ", (t) => {
	const files = [createFileItem("dir1", true), createFileItem("dir2", true)];
	const result = countFileTypes(files);
	t.deepEqual(result, { files: 0, directories: 2 });
});

test("countFileTypes: 純粋関数の検証", (t) => {
	const files = [
		createFileItem("file1.txt", false),
		createFileItem("dir1", true),
	];
	const result1 = countFileTypes(files);
	const result2 = countFileTypes(files);
	t.deepEqual(result1, result2);
});

// ====================================================================
// Property-based testing
// ====================================================================

test("formatFileSize: 負の値でもエラーにならない", (t) => {
	const result = formatFileSize(-1);
	t.is(typeof result, "string");
});

test("formatFileSize: 非常に大きな値", (t) => {
	const result = formatFileSize(Number.MAX_SAFE_INTEGER);
	t.is(typeof result, "string");
	t.true(result.includes("TB"));
});

test("truncateFileName: 極端に短いターミナル幅", (t) => {
	const result = truncateFileName("test.txt", 10);
	t.is(typeof result, "string");
	t.true(result.length <= 10);
});

test("truncateFileName: 極端に長いファイル名", (t) => {
	const longName = `${"a".repeat(10000)}.txt`;
	const result = truncateFileName(longName, 100);
	t.is(typeof result, "string");
	t.true(result.length <= 100);
});

test("getFileIcon: 様々な拡張子パターン", (t) => {
	const extensions = [
		".js",
		".ts",
		".json",
		".md",
		".png",
		".pdf",
		".zip",
		".exe",
		".unknown",
	];

	for (const ext of extensions) {
		const file = createFileItem(`test${ext}`, false);
		const result = getFileIcon(file);
		t.is(typeof result, "string");
		t.true(result.length > 0);
	}
});
