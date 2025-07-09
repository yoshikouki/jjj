/**
 * formatFileSize 関数の基本的なテスト（Bun用）
 */

import { expect, test } from "bun:test";

// 基本的なファイルサイズのフォーマット関数
const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return "0 B";

	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	// 適切な単位に変換
	const size = bytes / k ** i;

	// 小数点以下の桁数を制御
	const formatted = i === 0 ? size.toString() : size.toFixed(1);

	return `${formatted} ${sizes[i]}`;
};

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

test("formatFileSize: 非整数のバイト数", () => {
	const result = formatFileSize(1536);
	expect(result).toBe("1.5 KB");
});

test("formatFileSize: 大きなファイル", () => {
	const result = formatFileSize(1024 * 1024 * 1024 * 1024);
	expect(result).toBe("1.0 TB");
});

test("formatFileSize: 純粋関数の検証", () => {
	const bytes = 2048;
	const result1 = formatFileSize(bytes);
	const result2 = formatFileSize(bytes);
	expect(result1).toBe(result2);
});

test("formatFileSize: 負の値", () => {
	const result = formatFileSize(-1);
	expect(typeof result).toBe("string");
});

test("formatFileSize: 非常に大きな値", () => {
	const result = formatFileSize(Number.MAX_SAFE_INTEGER);
	expect(typeof result).toBe("string");
	expect(result).toContain("TB");
});

test("formatFileSize: 様々なサイズ値", () => {
	const testCases = [
		{ bytes: 0, expected: "0 B" },
		{ bytes: 512, expected: "512 B" },
		{ bytes: 1024, expected: "1.0 KB" },
		{ bytes: 1536, expected: "1.5 KB" },
		{ bytes: 1024 * 1024, expected: "1.0 MB" },
		{ bytes: 1024 * 1024 * 1024, expected: "1.0 GB" },
	];

	for (const { bytes, expected } of testCases) {
		expect(formatFileSize(bytes)).toBe(expected);
	}
});
