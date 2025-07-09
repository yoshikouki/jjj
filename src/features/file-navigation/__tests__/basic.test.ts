/**
 * 基本的なテスト
 */

import test from "ava";

test("基本的なテスト", (t) => {
	t.pass("テストが動作している");
});

test("数値の計算", (t) => {
	t.is(1 + 1, 2);
});

test("文字列の比較", (t) => {
	t.is("hello", "hello");
});

test("配列の比較", (t) => {
	t.deepEqual([1, 2, 3], [1, 2, 3]);
});

test("非同期処理", async (t) => {
	const result = await Promise.resolve(42);
	t.is(result, 42);
});
