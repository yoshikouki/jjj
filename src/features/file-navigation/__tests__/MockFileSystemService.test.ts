/**
 * MockFileSystemService のテスト
 *
 * モックサービスが正しく動作し、インターフェースを適切に実装していることを確認
 * テスタブル設計の実証として、any 型を使わずに完全にテスト可能
 */

import { beforeEach, describe, expect, test } from "bun:test";
import {
	MockCachedFileSystemService,
	MockEnvironmentService,
	type MockFileSystemEntry,
	MockFileSystemService,
	MockPathUtilsService,
} from "../implementations/MockFileSystemService.js";
import type { FileItem } from "../types/index.js";

describe("MockFileSystemService", () => {
	let mockFS: MockFileSystemService;

	beforeEach(() => {
		// テスト用のファイルシステム構造を作成
		const testFS = new Map<string, MockFileSystemEntry>();

		testFS.set("/test", {
			name: "test",
			isDirectory: true,
			size: 0,
			modified: new Date("2023-01-01T12:00:00Z"),
			children: new Map([
				[
					"file1.txt",
					{
						name: "file1.txt",
						isDirectory: false,
						size: 1024,
						modified: new Date("2023-01-01T12:00:00Z"),
						content: "Test file content\nLine 2\nLine 3",
					},
				],
				[
					"subdir",
					{
						name: "subdir",
						isDirectory: true,
						size: 0,
						modified: new Date("2023-01-01T13:00:00Z"),
						children: new Map(),
					},
				],
			]),
		});

		mockFS = new MockFileSystemService({
			initialFileSystem: testFS,
			simulatedDelay: 0, // テストでは遅延なし
		});
	});

	describe("readDirectory", () => {
		test("should read directory contents successfully", async () => {
			const result = await mockFS.readDirectory("/test");

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data!).toHaveLength(2);

			const fileNames = result.data!.map((f) => f.name);
			expect(fileNames).toContain("file1.txt");
			expect(fileNames).toContain("subdir");
		});

		test("should return error for non-existent directory", async () => {
			const result = await mockFS.readDirectory("/nonexistent");

			expect(result.success).toBe(false);
			expect(result.error).toContain("Directory not found");
			expect(result.data).toBeUndefined();
		});

		test("should return error when trying to read file as directory", async () => {
			const result = await mockFS.readDirectory("/test/file1.txt");

			expect(result.success).toBe(false);
			expect(result.error).toContain("Not a directory");
		});
	});

	describe("readFilePreview", () => {
		test("should read file content with line limit", async () => {
			const result = await mockFS.readFilePreview("/test/file1.txt", 1024, 2);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data!).toContain("Test file content");
			expect(result.data!).toContain("Line 2");
			expect(result.data!).toContain("(1 more lines)"); // 切り詰められたメッセージ
		});

		test("should return error for non-existent file", async () => {
			const result = await mockFS.readFilePreview("/nonexistent.txt");

			expect(result.success).toBe(false);
			expect(result.error).toContain("File not found");
		});

		test("should return error when trying to preview directory", async () => {
			const result = await mockFS.readFilePreview("/test");

			expect(result.success).toBe(false);
			expect(result.error).toContain("Cannot preview directory");
		});

		test("should handle file size limit", async () => {
			// 非常に小さなサイズ制限を設定
			const result = await mockFS.readFilePreview("/test/file1.txt", 10);

			expect(result.success).toBe(false);
			expect(result.error).toContain("File too large");
		});
	});

	describe("pathExists", () => {
		test("should return true for existing paths", async () => {
			expect(await mockFS.pathExists("/test")).toBe(true);
			expect(await mockFS.pathExists("/test/file1.txt")).toBe(true);
			expect(await mockFS.pathExists("/test/subdir")).toBe(true);
		});

		test("should return false for non-existent paths", async () => {
			expect(await mockFS.pathExists("/nonexistent")).toBe(false);
			expect(await mockFS.pathExists("/test/nonexistent.txt")).toBe(false);
		});
	});

	describe("isDirectory", () => {
		test("should correctly identify directories", async () => {
			expect(await mockFS.isDirectory("/test")).toBe(true);
			expect(await mockFS.isDirectory("/test/subdir")).toBe(true);
			expect(await mockFS.isDirectory("/test/file1.txt")).toBe(false);
		});

		test("should return false for non-existent paths", async () => {
			expect(await mockFS.isDirectory("/nonexistent")).toBe(false);
		});
	});

	describe("isFile", () => {
		test("should correctly identify files", async () => {
			expect(await mockFS.isFile("/test/file1.txt")).toBe(true);
			expect(await mockFS.isFile("/test")).toBe(false);
			expect(await mockFS.isFile("/test/subdir")).toBe(false);
		});

		test("should return false for non-existent paths", async () => {
			expect(await mockFS.isFile("/nonexistent")).toBe(false);
		});
	});

	describe("getFileInfo", () => {
		test("should return file information successfully", async () => {
			const result = await mockFS.getFileInfo("/test/file1.txt");

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data!.name).toBe("file1.txt");
			expect(result.data!.isDirectory).toBe(false);
			expect(result.data!.size).toBe(1024);
		});

		test("should return error for non-existent file", async () => {
			const result = await mockFS.getFileInfo("/nonexistent.txt");

			expect(result.success).toBe(false);
			expect(result.error).toContain("File not found");
		});
	});

	describe("getMultipleFileInfo", () => {
		test("should return information for multiple files", async () => {
			const paths = ["/test/file1.txt", "/test/subdir", "/nonexistent.txt"];
			const results = await mockFS.getMultipleFileInfo(paths);

			// 存在するファイルのみが返される
			expect(results).toHaveLength(2);
			expect(results.map((f) => f.name)).toContain("file1.txt");
			expect(results.map((f) => f.name)).toContain("subdir");
		});
	});

	describe("Test Helper Methods", () => {
		test("should add and remove files dynamically", () => {
			const newFile: MockFileSystemEntry = {
				name: "new-file.txt",
				isDirectory: false,
				size: 512,
				modified: new Date(),
				content: "New file content",
			};

			// ファイルを追加
			mockFS.addFile("/test/new-file.txt", newFile);

			// 存在確認
			expect(mockFS.pathExists("/test/new-file.txt")).resolves.toBe(true);

			// ファイルを削除
			mockFS.removeEntry("/test/new-file.txt");

			// 削除確認
			expect(mockFS.pathExists("/test/new-file.txt")).resolves.toBe(false);
		});

		test("should handle error paths correctly", async () => {
			// エラーパスを追加
			mockFS.addErrorPath("/error-path");

			const result = await mockFS.readDirectory("/error-path");

			expect(result.success).toBe(false);
			expect(result.error).toContain("Simulated error");

			// エラーパスを削除
			mockFS.removeErrorPath("/error-path");

			// 削除後はエラーにならない（ただし存在しないので別のエラー）
			const result2 = await mockFS.readDirectory("/error-path");
			expect(result2.error).not.toContain("Simulated error");
		});

		test("should reset to initial state", async () => {
			// 状態を変更
			mockFS.addErrorPath("/error");
			mockFS.setSimulatedDelay(100);

			// リセット
			mockFS.reset();

			// 初期状態に戻ることを確認
			const result = await mockFS.readDirectory("/test");
			expect(result.success).toBe(true);
		});
	});
});

describe("MockCachedFileSystemService", () => {
	let cachedMockFS: MockCachedFileSystemService;

	beforeEach(() => {
		const testFS = new Map<string, MockFileSystemEntry>();

		testFS.set("/test", {
			name: "test",
			isDirectory: true,
			size: 0,
			modified: new Date(),
			children: new Map([
				[
					"file1.txt",
					{
						name: "file1.txt",
						isDirectory: false,
						size: 1024,
						modified: new Date(),
						content: "Test content",
					},
				],
			]),
		});

		cachedMockFS = new MockCachedFileSystemService({
			initialFileSystem: testFS,
			simulatedDelay: 0,
			maxCacheSize: 10,
		});
	});

	test("should cache directory reads", async () => {
		// 初回読み込み
		const result1 = await cachedMockFS.readDirectoryWithCache("/test", 5000);
		expect(result1.success).toBe(true);

		// キャッシュ統計を確認
		const stats1 = cachedMockFS.getCacheStats();
		expect(stats1.size).toBe(1);

		// 2回目の読み込み（キャッシュから）
		const result2 = await cachedMockFS.readDirectoryWithCache("/test", 5000);
		expect(result2.success).toBe(true);
		expect(result2.data!).toEqual(result1.data!);

		// キャッシュサイズは変わらない
		const stats2 = cachedMockFS.getCacheStats();
		expect(stats2.size).toBe(1);
	});

	test("should expire cached entries", async () => {
		// 短いTTLで読み込み
		await cachedMockFS.readDirectoryWithCache("/test", 1);

		// TTL期限切れまで待機
		await new Promise((resolve) => setTimeout(resolve, 5));

		// 期限切れ後の読み込み（新しく読み込まれる）
		const result = await cachedMockFS.readDirectoryWithCache("/test", 5000);
		expect(result.success).toBe(true);
	});

	test("should clear cache", async () => {
		// キャッシュに追加
		await cachedMockFS.readDirectoryWithCache("/test");

		const stats1 = cachedMockFS.getCacheStats();
		expect(stats1.size).toBeGreaterThan(0);

		// キャッシュをクリア
		cachedMockFS.clearCache();

		const stats2 = cachedMockFS.getCacheStats();
		expect(stats2.size).toBe(0);
	});
});

describe("MockPathUtilsService", () => {
	let pathUtils: MockPathUtilsService;

	beforeEach(() => {
		pathUtils = new MockPathUtilsService();
	});

	test("should get parent directory correctly", () => {
		expect(pathUtils.getParentDirectory("/home/user/documents")).toBe(
			"/home/user",
		);
		expect(pathUtils.getParentDirectory("/home")).toBe("/");
		expect(pathUtils.getParentDirectory("/")).toBe("/");
	});

	test("should normalize paths", () => {
		expect(pathUtils.normalizePath("relative/path")).toBe("/relative/path");
		expect(pathUtils.normalizePath("/absolute/path")).toBe("/absolute/path");
	});

	test("should resolve relative paths", () => {
		expect(pathUtils.resolveRelativePath("file.txt", "/home/user")).toBe(
			"/home/user/file.txt",
		);
		expect(pathUtils.resolveRelativePath("/absolute.txt", "/home/user")).toBe(
			"/absolute.txt",
		);
	});

	test("should identify root directory", () => {
		expect(pathUtils.isRootDirectory("/")).toBe(true);
		expect(pathUtils.isRootDirectory("/home")).toBe(false);
	});

	test("should check path safety", () => {
		expect(pathUtils.isSafePath("/home/user/file.txt", "/home/user")).toBe(
			true,
		);
		expect(pathUtils.isSafePath("/etc/passwd", "/home/user")).toBe(false);
	});
});

describe("MockEnvironmentService", () => {
	let envService: MockEnvironmentService;

	beforeEach(() => {
		envService = new MockEnvironmentService();
	});

	test("should provide current working directory", () => {
		expect(envService.getCurrentWorkingDirectory()).toBe("/test");

		// 変更可能
		envService.setCurrentWorkingDirectory("/new/path");
		expect(envService.getCurrentWorkingDirectory()).toBe("/new/path");
	});

	test("should handle environment variables", () => {
		expect(envService.getEnvironmentVariable("NONEXISTENT")).toBeUndefined();

		envService.setEnvironmentVariable("TEST_VAR", "test-value");
		expect(envService.getEnvironmentVariable("TEST_VAR")).toBe("test-value");
	});

	test("should return test environment", () => {
		expect(envService.getEnvironment()).toBe("test");

		envService.setEnvironment("production");
		expect(envService.getEnvironment()).toBe("production");
	});

	test("should reset to initial state", () => {
		// 状態を変更
		envService.setCurrentWorkingDirectory("/changed");
		envService.setEnvironmentVariable("KEY", "value");
		envService.setEnvironment("production");

		// リセット
		envService.reset();

		// 初期状態に戻ることを確認
		expect(envService.getCurrentWorkingDirectory()).toBe("/test");
		expect(envService.getEnvironmentVariable("KEY")).toBeUndefined();
		expect(envService.getEnvironment()).toBe("test");
	});
});

describe("Type Safety and Interface Compliance", () => {
	test("should maintain type safety without any or unknown types", () => {
		// この関数は型安全性を実証するためのもの
		const verifyTypeSafety = (
			fs: MockFileSystemService,
			pathUtils: MockPathUtilsService,
			env: MockEnvironmentService,
		): void => {
			// 全てのメソッドが明確な型を持つ
			const dirResult: Promise<{
				success: boolean;
				data?: FileItem[];
				error?: string;
			}> = fs.readDirectory("/test");

			const previewResult: Promise<{
				success: boolean;
				data?: string;
				error?: string;
			}> = fs.readFilePreview("/test/file.txt");

			const existsResult: Promise<boolean> = fs.pathExists("/test");

			const parentPath: string = pathUtils.getParentDirectory("/test/path");

			const cwd: string = env.getCurrentWorkingDirectory();

			// コンパイルエラーなしに型チェックが通る
			expect(typeof dirResult).toBe("object");
			expect(typeof previewResult).toBe("object");
			expect(typeof existsResult).toBe("object");
			expect(typeof parentPath).toBe("string");
			expect(typeof cwd).toBe("string");
		};

		const fs = new MockFileSystemService();
		const pathUtils = new MockPathUtilsService();
		const env = new MockEnvironmentService();

		// any 型や unknown 型を使わずに実行可能
		expect(() => verifyTypeSafety(fs, pathUtils, env)).not.toThrow();
	});
});
