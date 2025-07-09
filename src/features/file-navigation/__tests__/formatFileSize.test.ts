/**
 * formatFileSize 関数の基本的なテスト
 */

import test from "ava";

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

test("formatFileSize: 0バイトの場合", (t) => {
	const result = formatFileSize(0);
	t.is(result, "0 B");
});

test("formatFileSize: 1バイトの場合", (t) => {
	const result = formatFileSize(1);
	t.is(result, "1 B");
});

test("formatFileSize: 1024バイト（1KB）の場合", (t) => {
	const result = formatFileSize(1024);
	t.is(result, "1.0 KB");
});

test("formatFileSize: 1MBの場合", (t) => {
	const result = formatFileSize(1024 * 1024);
	t.is(result, "1.0 MB");
});

test("formatFileSize: 1GBの場合", (t) => {
	const result = formatFileSize(1024 * 1024 * 1024);
	t.is(result, "1.0 GB");
});

test("formatFileSize: 非整数のバイト数", (t) => {
	const result = formatFileSize(1536);
	t.is(result, "1.5 KB");
});

test("formatFileSize: 大きなファイル", (t) => {
	const result = formatFileSize(1024 * 1024 * 1024 * 1024);
	t.is(result, "1.0 TB");
});

test("formatFileSize: 純粋関数の検証", (t) => {
	const bytes = 2048;
	const result1 = formatFileSize(bytes);
	const result2 = formatFileSize(bytes);
	t.is(result1, result2);
});
