/**
 * useFileNavigation フックのテスト（改良版）
 *
 * 依存性注入を活用し、モックサービスを使用したテスタブルな実装のテスト
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type { FileNavigationDependencies } from "../hooks/useFileNavigation.js";
import { useFileNavigation } from "../hooks/useFileNavigation.js";
import {
	MockCachedFileSystemService,
	MockEnvironmentService,
	type MockFileSystemEntry,
	MockPathUtilsService,
} from "../implementations/MockFileSystemService.js";
import type { FileItem } from "../types/index.js";

// テスト用のファイルシステム構造を作成
const createTestFileSystem = (): Map<string, MockFileSystemEntry> => {
	const fs = new Map<string, MockFileSystemEntry>();

	fs.set("/test", {
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
					content: "Test file 1 content",
				},
			],
			[
				"file2.js",
				{
					name: "file2.js",
					isDirectory: false,
					size: 512,
					modified: new Date("2023-01-01T12:30:00Z"),
					content: 'console.log("Hello, World!");',
				},
			],
			[
				"subdir",
				{
					name: "subdir",
					isDirectory: true,
					size: 0,
					modified: new Date("2023-01-01T13:00:00Z"),
					children: new Map([
						[
							"nested.txt",
							{
								name: "nested.txt",
								isDirectory: false,
								size: 256,
								modified: new Date("2023-01-01T13:30:00Z"),
								content: "Nested file content",
							},
						],
					]),
				},
			],
		]),
	});

	return fs;
};

// テスト用の依存性を作成
const createTestDependencies = (
	initialFileSystem?: Map<string, MockFileSystemEntry>,
): FileNavigationDependencies => {
	const fileSystemService = new MockCachedFileSystemService({
		initialFileSystem: initialFileSystem || createTestFileSystem(),
		simulatedDelay: 0, // テストでは遅延なし
	});

	const pathUtilsService = new MockPathUtilsService();
	const environmentService = new MockEnvironmentService();

	// テスト環境の設定
	environmentService.setCurrentWorkingDirectory("/test");
	environmentService.setEnvironment("test");

	return {
		fileSystemService,
		pathUtilsService,
		environmentService,
	};
};

describe("useFileNavigation with dependency injection", () => {
	let dependencies: FileNavigationDependencies;

	beforeEach(() => {
		dependencies = createTestDependencies();
	});

	test("should initialize with correct initial state", async () => {
		const { result } = renderHook(() =>
			useFileNavigation({
				dependencies,
				initialPath: "/test",
			}),
		);

		// 初期状態の確認
		expect(result.current.state.currentPath).toBe("/test");
		expect(result.current.state.selectedIndex).toBe(0);
		expect(result.current.state.isLoading).toBe(true); // 初回読み込み中
		expect(result.current.state.error).toBe(null);

		// ファイル読み込み完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		expect(result.current.state.isLoading).toBe(false);
		expect(result.current.state.files.length).toBeGreaterThan(0);
	});

	test("should load files from directory", async () => {
		const { result } = renderHook(() =>
			useFileNavigation({
				dependencies,
				initialPath: "/test",
			}),
		);

		// ファイル読み込み完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		const { files } = result.current.state;

		// 親ディレクトリエントリを含む4つのファイルがあることを確認
		expect(files).toHaveLength(4); // ['..' + 'file1.txt', 'file2.js', 'subdir']

		// 親ディレクトリエントリの確認
		expect(files[0].name).toBe("..");
		expect(files[0].isDirectory).toBe(true);

		// ファイルの確認
		const fileNames = files.slice(1).map((f) => f.name);
		expect(fileNames).toContain("file1.txt");
		expect(fileNames).toContain("file2.js");
		expect(fileNames).toContain("subdir");
	});

	test("should navigate to directory", async () => {
		const { result } = renderHook(() =>
			useFileNavigation({
				dependencies,
				initialPath: "/test",
			}),
		);

		// 初回読み込み完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		// サブディレクトリに移動
		await act(async () => {
			await result.current.actions.navigateToDirectory("/test/subdir");
		});

		// パスが変更されることを確認
		expect(result.current.state.currentPath).toBe("/test/subdir");

		// ファイル読み込み完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		// サブディレクトリのファイルが読み込まれることを確認
		expect(result.current.state.files).toHaveLength(2); // ['..' + 'nested.txt']
		expect(result.current.state.files[1].name).toBe("nested.txt");
	});

	test("should navigate up to parent directory", async () => {
		const { result } = renderHook(() =>
			useFileNavigation({
				dependencies,
				initialPath: "/test/subdir",
			}),
		);

		// 初回読み込み完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		// 親ディレクトリに移動
		await act(async () => {
			await result.current.actions.navigateUp();
		});

		expect(result.current.state.currentPath).toBe("/test");
	});

	test("should select files correctly", async () => {
		const { result } = renderHook(() =>
			useFileNavigation({
				dependencies,
				initialPath: "/test",
			}),
		);

		// 初回読み込み完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		// ファイルを選択
		act(() => {
			result.current.actions.selectFile(1);
		});

		expect(result.current.state.selectedIndex).toBe(1);

		// 次のファイルを選択
		act(() => {
			result.current.actions.selectNext();
		});

		expect(result.current.state.selectedIndex).toBe(2);

		// 前のファイルを選択
		act(() => {
			result.current.actions.selectPrevious();
		});

		expect(result.current.state.selectedIndex).toBe(1);
	});

	test("should change sort configuration", async () => {
		const { result } = renderHook(() =>
			useFileNavigation({
				dependencies,
				initialPath: "/test",
			}),
		);

		// 初回読み込み完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		// ソート設定を変更
		await act(async () => {
			result.current.actions.setSortConfig({
				sortBy: "size",
				order: "desc",
			});
		});

		expect(result.current.state.sortConfig.sortBy).toBe("size");
		expect(result.current.state.sortConfig.order).toBe("desc");

		// ファイル読み込み完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		// ファイルがソートされていることを確認（サイズ順降順）
		const files = result.current.state.files.slice(1); // 親ディレクトリエントリを除く
		const fileSizes = files.filter((f) => !f.isDirectory).map((f) => f.size);

		// 降順にソートされていることを確認
		for (let i = 0; i < fileSizes.length - 1; i++) {
			expect(fileSizes[i]).toBeGreaterThanOrEqual(fileSizes[i + 1]);
		}
	});

	test("should refresh files", async () => {
		const { result } = renderHook(() =>
			useFileNavigation({
				dependencies,
				initialPath: "/test",
			}),
		);

		// 初回読み込み完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		const initialFileCount = result.current.state.files.length;

		// ファイルをリフレッシュ
		await act(async () => {
			await result.current.actions.refreshFiles();
		});

		// ファイル数が変わらないことを確認（モックデータなので）
		expect(result.current.state.files.length).toBe(initialFileCount);
	});

	test("should get selected file correctly", async () => {
		const { result } = renderHook(() =>
			useFileNavigation({
				dependencies,
				initialPath: "/test",
			}),
		);

		// 初回読み込み完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		// ファイルを選択
		act(() => {
			result.current.actions.selectFile(1);
		});

		const selectedFile = result.current.getSelectedFile();
		expect(selectedFile).not.toBe(null);
		expect(selectedFile?.name).toBe(result.current.state.files[1].name);
	});

	test("should get navigation info correctly", async () => {
		const { result } = renderHook(() =>
			useFileNavigation({
				dependencies,
				initialPath: "/test",
			}),
		);

		// 初回読み込み完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		// 2番目のファイルを選択
		act(() => {
			result.current.actions.selectFile(1);
		});

		const navInfo = result.current.getNavigationInfo();

		expect(navInfo.currentFile?.name).toBe(result.current.state.files[1].name);
		expect(navInfo.prevFile?.name).toBe(result.current.state.files[0].name);
		expect(navInfo.nextFile?.name).toBe(result.current.state.files[2].name);
		expect(navInfo.canGoUp).toBe(true); // /test は root ではない
	});

	test("should calculate stats correctly", async () => {
		const { result } = renderHook(() =>
			useFileNavigation({
				dependencies,
				initialPath: "/test",
			}),
		);

		// 初回読み込み完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		const stats = result.current.getStats();

		// 親ディレクトリエントリを除いて2ファイル、1ディレクトリ
		expect(stats.totalFiles).toBe(2);
		expect(stats.totalDirectories).toBe(2); // '..' + 'subdir'
		expect(stats.totalItems).toBe(4);
		expect(stats.totalSize).toBe(1024 + 512); // file1.txt + file2.js
	});

	test("should handle errors gracefully", async () => {
		// エラーパスを設定
		const mockFS = new MockCachedFileSystemService({
			initialFileSystem: createTestFileSystem(),
			simulatedDelay: 0,
		});
		mockFS.addErrorPath("/error-path");

		const errorDependencies = {
			...dependencies,
			fileSystemService: mockFS,
		};

		const { result } = renderHook(() =>
			useFileNavigation({
				dependencies: errorDependencies,
				initialPath: "/error-path",
			}),
		);

		// エラー処理完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		expect(result.current.state.error).not.toBe(null);
		expect(result.current.state.files).toHaveLength(0);
		expect(result.current.state.isLoading).toBe(false);
	});

	test("should use cache correctly", async () => {
		const { result } = renderHook(() =>
			useFileNavigation({
				dependencies,
				initialPath: "/test",
			}),
		);

		// 初回読み込み完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		// キャッシュ統計を確認
		const cacheStats = result.current.getCacheStats();
		expect(cacheStats.size).toBeGreaterThan(0);

		// キャッシュをクリア
		act(() => {
			result.current.clearCache();
		});

		const clearedCacheStats = result.current.getCacheStats();
		expect(clearedCacheStats.size).toBe(0);
	});

	test("should handle boundary conditions correctly", async () => {
		const { result } = renderHook(() =>
			useFileNavigation({
				dependencies,
				initialPath: "/test",
			}),
		);

		// 初回読み込み完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		const fileCount = result.current.state.files.length;

		// 最初のファイルで selectPrevious を実行
		act(() => {
			result.current.actions.selectFile(0);
			result.current.actions.selectPrevious();
		});

		expect(result.current.state.selectedIndex).toBe(0);

		// 最後のファイルで selectNext を実行
		act(() => {
			result.current.actions.selectFile(fileCount - 1);
			result.current.actions.selectNext();
		});

		expect(result.current.state.selectedIndex).toBe(fileCount - 1);
	});
});

describe("useFileNavigation edge cases", () => {
	test("should handle empty directory correctly", async () => {
		const emptyFS = new Map<string, MockFileSystemEntry>();
		emptyFS.set("/empty", {
			name: "empty",
			isDirectory: true,
			size: 0,
			modified: new Date(),
			children: new Map(),
		});

		const dependencies = createTestDependencies(emptyFS);

		const { result } = renderHook(() =>
			useFileNavigation({
				dependencies,
				initialPath: "/empty",
			}),
		);

		// 読み込み完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		// 親ディレクトリエントリのみ存在することを確認
		expect(result.current.state.files).toHaveLength(1);
		expect(result.current.state.files[0].name).toBe("..");
	});

	test("should handle root directory correctly", async () => {
		const rootFS = new Map<string, MockFileSystemEntry>();
		rootFS.set("/", {
			name: "/",
			isDirectory: true,
			size: 0,
			modified: new Date(),
			children: new Map([
				[
					"test",
					{
						name: "test",
						isDirectory: true,
						size: 0,
						modified: new Date(),
						children: new Map(),
					},
				],
			]),
		});

		const dependencies = createTestDependencies(rootFS);

		const { result } = renderHook(() =>
			useFileNavigation({
				dependencies,
				initialPath: "/",
			}),
		);

		// 読み込み完了まで待機
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		// ルートディレクトリでは親ディレクトリエントリが追加されない
		expect(result.current.state.files).toHaveLength(1);
		expect(result.current.state.files[0].name).toBe("test");

		// 親ディレクトリに移動しようとしても移動しない
		const currentPath = result.current.state.currentPath;
		await act(async () => {
			await result.current.actions.navigateUp();
		});

		expect(result.current.state.currentPath).toBe(currentPath);
	});
});
