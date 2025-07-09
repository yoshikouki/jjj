/**
 * fileFormat.ts 純粋関数のテスト（Bun用）
 *
 * 全ての関数が純粋関数であることを確認し、
 * 境界値やエラーケースを含む包括的なテストを実装
 */

import { expect, test } from "bun:test";
import type { DisplayConfig, FileItem, TerminalSize } from "../types/index.js";
import {
	calculateTotalSize,
	countFileTypes,
	formatAbsoluteDate,
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
const _createDisplayConfig = (
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

test("formatFileSize: 0バイトの場合", () => {
	const result = formatFileSize(0);
	expect(result).toBe("0 B");
});

test("formatFileSize: 1バイトの場合", () => {
	const result = formatFileSize(1);
	expect(result).toBe("1 B");
});

test("formatFileSize: 1024バイト（1KB）の場合", () => {
	const result = formatFileSize(1024);
	expect(result).toBe("1.0 KB");
});

test("formatFileSize: 1MBの場合", () => {
	const result = formatFileSize(1024 * 1024);
	expect(result).toBe("1.0 MB");
});

test("formatFileSize: 1GBの場合", () => {
	const result = formatFileSize(1024 * 1024 * 1024);
	expect(result).toBe("1.0 GB");
});

test("formatFileSize: 純粋関数の検証", () => {
	const bytes = 2048;
	const result1 = formatFileSize(bytes);
	const result2 = formatFileSize(bytes);
	expect(result1).toBe(result2);
});

// ====================================================================
// truncateFileName 関数のテスト
// ====================================================================

test("truncateFileName: 短いファイル名はそのまま", () => {
	const result = truncateFileName("test.txt", 100);
	expect(result).toBe("test.txt");
});

test("truncateFileName: 長いファイル名は省略", () => {
	const longName = `${"a".repeat(100)}.txt`;
	const result = truncateFileName(longName, 50);
	expect(result).toContain("...");
	expect(result).toContain(".txt");
});

test("truncateFileName: 空のファイル名", () => {
	const result = truncateFileName("", 100);
	expect(result).toBe("");
});

test("truncateFileName: 純粋関数の検証", () => {
	const name = "testfile.txt";
	const width = 80;
	const result1 = truncateFileName(name, width);
	const result2 = truncateFileName(name, width);
	expect(result1).toBe(result2);
});

// ====================================================================
// formatRelativeDate 関数のテスト
// ====================================================================

test("formatRelativeDate: 現在時刻", () => {
	const now = new Date();
	const result = formatRelativeDate(now, now);
	expect(result).toBe("just now");
});

test("formatRelativeDate: 1分前", () => {
	const now = new Date();
	const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
	const result = formatRelativeDate(oneMinuteAgo, now);
	expect(result).toBe("1m ago");
});

test("formatRelativeDate: 1時間前", () => {
	const now = new Date();
	const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
	const result = formatRelativeDate(oneHourAgo, now);
	expect(result).toBe("1h ago");
});

test("formatRelativeDate: 1日前", () => {
	const now = new Date();
	const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const result = formatRelativeDate(oneDayAgo, now);
	expect(result).toBe("1d ago");
});

test("formatRelativeDate: 純粋関数の検証", () => {
	const date = new Date("2023-01-01T12:00:00Z");
	const now = new Date("2023-01-01T13:00:00Z");
	const result1 = formatRelativeDate(date, now);
	const result2 = formatRelativeDate(date, now);
	expect(result1).toBe(result2);
});

// ====================================================================
// formatAbsoluteDate 関数のテスト
// ====================================================================

test("formatAbsoluteDate: 正常な日付", () => {
	const date = new Date("2023-01-01T12:00:00Z");
	const result = formatAbsoluteDate(date);
	expect(result).toContain("2023");
	expect(result).toContain("01");
	expect(result).toContain("12");
});

test("formatAbsoluteDate: 純粋関数の検証", () => {
	const date = new Date("2023-01-01T12:00:00Z");
	const result1 = formatAbsoluteDate(date);
	const result2 = formatAbsoluteDate(date);
	expect(result1).toBe(result2);
});

// ====================================================================
// getFileIcon 関数のテスト
// ====================================================================

test("getFileIcon: ディレクトリ", () => {
	const file = createFileItem("test", true);
	const result = getFileIcon(file);
	expect(result).toBe("📁");
});

test("getFileIcon: JavaScript ファイル", () => {
	const file = createFileItem("test.js", false);
	const result = getFileIcon(file);
	expect(result).toBe("📜");
});

test("getFileIcon: TypeScript ファイル", () => {
	const file = createFileItem("test.ts", false);
	const result = getFileIcon(file);
	expect(result).toBe("📜");
});

test("getFileIcon: JSON ファイル", () => {
	const file = createFileItem("test.json", false);
	const result = getFileIcon(file);
	expect(result).toBe("📋");
});

test("getFileIcon: 不明な拡張子", () => {
	const file = createFileItem("test.unknown", false);
	const result = getFileIcon(file);
	expect(result).toBe("📄");
});

test("getFileIcon: 純粋関数の検証", () => {
	const file = createFileItem("test.js", false);
	const result1 = getFileIcon(file);
	const result2 = getFileIcon(file);
	expect(result1).toBe(result2);
});

// ====================================================================
// truncatePath 関数のテスト
// ====================================================================

test("truncatePath: 短いパス", () => {
	const path = "/home/user/test";
	const result = truncatePath(path, 100);
	expect(result).toBe(path);
});

test("truncatePath: 長いパス", () => {
	const path = "/very/long/path/with/many/segments/test";
	const result = truncatePath(path, 30);
	expect(result).toContain("...");
	expect(result.length).toBeLessThanOrEqual(30 - 10); // 予約領域を考慮
});

test("truncatePath: 純粋関数の検証", () => {
	const path = "/home/user/test";
	const width = 80;
	const result1 = truncatePath(path, width);
	const result2 = truncatePath(path, width);
	expect(result1).toBe(result2);
});

// ====================================================================
// formatScrollIndicator 関数のテスト
// ====================================================================

test("formatScrollIndicator: 基本的な表示", () => {
	const result = formatScrollIndicator(0, 10, 20);
	expect(result).toBe("1-10 of 20");
});

test("formatScrollIndicator: 上にスクロール可能", () => {
	const result = formatScrollIndicator(5, 15, 20);
	expect(result).toBe("↑ 6-15 of 20");
});

test("formatScrollIndicator: 下にスクロール可能", () => {
	const result = formatScrollIndicator(0, 10, 20);
	expect(result).toBe("1-10 of 20 ↓");
});

test("formatScrollIndicator: 純粋関数の検証", () => {
	const result1 = formatScrollIndicator(0, 10, 20);
	const result2 = formatScrollIndicator(0, 10, 20);
	expect(result1).toBe(result2);
});

// ====================================================================
// getDefaultDisplayConfig 関数のテスト
// ====================================================================

test("getDefaultDisplayConfig: 基本的な設定", () => {
	const terminalSize = createTerminalSize(100, 30);
	const result = getDefaultDisplayConfig(terminalSize);

	expect(result.terminalSize).toEqual(terminalSize);
	expect(result.showFileSize).toBe(true);
	expect(result.showModifiedDate).toBe(true);
	expect(result.maxFileNameLength).toBe(75);
});

test("getDefaultDisplayConfig: 狭いターミナル", () => {
	const terminalSize = createTerminalSize(50, 30);
	const result = getDefaultDisplayConfig(terminalSize);

	expect(result.showFileSize).toBe(false);
	expect(result.showModifiedDate).toBe(false);
	expect(result.maxFileNameLength).toBe(25);
});

test("getDefaultDisplayConfig: 純粋関数の検証", () => {
	const terminalSize = createTerminalSize(100, 30);
	const result1 = getDefaultDisplayConfig(terminalSize);
	const result2 = getDefaultDisplayConfig(terminalSize);
	expect(result1).toEqual(result2);
});

// ====================================================================
// calculateTotalSize 関数のテスト
// ====================================================================

test("calculateTotalSize: 空の配列", () => {
	const result = calculateTotalSize([]);
	expect(result).toBe(0);
});

test("calculateTotalSize: ファイルのみ", () => {
	const files = [
		createFileItem("file1.txt", false, 1024),
		createFileItem("file2.txt", false, 2048),
	];
	const result = calculateTotalSize(files);
	expect(result).toBe(3072);
});

test("calculateTotalSize: ディレクトリは除外", () => {
	const files = [
		createFileItem("file1.txt", false, 1024),
		createFileItem("dir1", true, 0),
		createFileItem("file2.txt", false, 2048),
	];
	const result = calculateTotalSize(files);
	expect(result).toBe(3072);
});

test("calculateTotalSize: 純粋関数の検証", () => {
	const files = [
		createFileItem("file1.txt", false, 1024),
		createFileItem("file2.txt", false, 2048),
	];
	const result1 = calculateTotalSize(files);
	const result2 = calculateTotalSize(files);
	expect(result1).toBe(result2);
});

// ====================================================================
// countFileTypes 関数のテスト
// ====================================================================

test("countFileTypes: 空の配列", () => {
	const result = countFileTypes([]);
	expect(result).toEqual({ files: 0, directories: 0 });
});

test("countFileTypes: ファイルとディレクトリ", () => {
	const files = [
		createFileItem("file1.txt", false),
		createFileItem("dir1", true),
		createFileItem("file2.txt", false),
		createFileItem("dir2", true),
	];
	const result = countFileTypes(files);
	expect(result).toEqual({ files: 2, directories: 2 });
});

test("countFileTypes: 純粋関数の検証", () => {
	const files = [
		createFileItem("file1.txt", false),
		createFileItem("dir1", true),
	];
	const result1 = countFileTypes(files);
	const result2 = countFileTypes(files);
	expect(result1).toEqual(result2);
});

// ====================================================================
// Property-based testing
// ====================================================================

test("formatFileSize: 様々なサイズパターン", () => {
	const testCases = [
		{ bytes: 0, expected: "0 B" },
		{ bytes: 1, expected: "1 B" },
		{ bytes: 1023, expected: "1023 B" },
		{ bytes: 1024, expected: "1.0 KB" },
		{ bytes: 1536, expected: "1.5 KB" },
		{ bytes: 1024 * 1024, expected: "1.0 MB" },
		{ bytes: 1024 * 1024 * 1024, expected: "1.0 GB" },
	];

	for (const { bytes, expected } of testCases) {
		expect(formatFileSize(bytes)).toBe(expected);
	}
});

test("getFileIcon: 様々な拡張子パターン", () => {
	const testCases = [
		{ name: "test.js", expected: "📜" },
		{ name: "test.ts", expected: "📜" },
		{ name: "test.json", expected: "📋" },
		{ name: "test.md", expected: "📄" },
		{ name: "test.png", expected: "🖼️" },
		{ name: "test.pdf", expected: "📕" },
		{ name: "test.zip", expected: "📦" },
		{ name: "test.unknown", expected: "📄" },
	];

	for (const { name, expected } of testCases) {
		const file = createFileItem(name, false);
		expect(getFileIcon(file)).toBe(expected);
	}
});

test("truncateFileName: 極端なケース", () => {
	// 極端に長いファイル名
	const longName = `${"a".repeat(1000)}.txt`;
	const result = truncateFileName(longName, 50);
	expect(typeof result).toBe("string");
	expect(result.length).toBeLessThanOrEqual(50);

	// 極端に短いターミナル幅
	const shortResult = truncateFileName("test.txt", 10);
	expect(typeof shortResult).toBe("string");
	expect(shortResult.length).toBeLessThanOrEqual(10);
});

test("formatRelativeDate: 境界値テスト", () => {
	const now = new Date();

	// 59秒前
	const fiftyNineSecondsAgo = new Date(now.getTime() - 59 * 1000);
	expect(formatRelativeDate(fiftyNineSecondsAgo, now)).toBe("just now");

	// ちょうど1分前
	const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
	expect(formatRelativeDate(oneMinuteAgo, now)).toBe("1m ago");

	// 59分前
	const fiftyNineMinutesAgo = new Date(now.getTime() - 59 * 60 * 1000);
	expect(formatRelativeDate(fiftyNineMinutesAgo, now)).toBe("59m ago");

	// ちょうど1時間前
	const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
	expect(formatRelativeDate(oneHourAgo, now)).toBe("1h ago");
});
