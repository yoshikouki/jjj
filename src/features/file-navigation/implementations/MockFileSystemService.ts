/**
 * テスト用ファイルシステムサービスのモック実装
 *
 * テスト環境で使用するモック実装
 * 実際のファイルシステムにアクセスせずにテストを実行できる
 */

import type {
	CachedFileSystemService,
	DirectoryReadResult,
	EnvironmentService,
	FileInfoResult,
	FilePreviewResult,
	FileSystemService,
	FileSystemServiceOptions,
	PathUtilsService,
} from "../interfaces/FileSystemService.js";
import type { FileItem } from "../types/index.js";

/**
 * モックファイルシステムの仮想ファイル構造
 */
export interface MockFileSystemEntry {
	name: string;
	isDirectory: boolean;
	size: number;
	modified: Date;
	content?: string; // ファイルの場合の内容
	children?: Map<string, MockFileSystemEntry>; // ディレクトリの場合の子要素
}

/**
 * モックファイルシステムの設定
 */
export interface MockFileSystemOptions extends FileSystemServiceOptions {
	/**
	 * 初期ファイルシステム構造
	 */
	initialFileSystem?: Map<string, MockFileSystemEntry>;

	/**
	 * 非同期処理の遅延時間（ミリ秒）
	 */
	simulatedDelay?: number;

	/**
	 * エラーを発生させるパス
	 */
	errorPaths?: Set<string>;

	/**
	 * アクセス権限のないパス
	 */
	restrictedPaths?: Set<string>;
}

/**
 * テスト用ファイルシステムサービスのモック実装
 */
export class MockFileSystemService implements FileSystemService {
	private fileSystem: Map<string, MockFileSystemEntry>;
	private options: MockFileSystemOptions;
	private simulatedDelay: number;

	constructor(options: MockFileSystemOptions = {}) {
		this.options = options;
		this.simulatedDelay = options.simulatedDelay || 0;
		this.fileSystem =
			options.initialFileSystem || this.createDefaultFileSystem();
	}

	private createDefaultFileSystem(): Map<string, MockFileSystemEntry> {
		const fs = new Map<string, MockFileSystemEntry>();

		// ルートディレクトリ
		fs.set("/", {
			name: "/",
			isDirectory: true,
			size: 0,
			modified: new Date("2023-01-01T00:00:00Z"),
			children: new Map(),
		});

		// テスト用ディレクトリとファイル
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
						content: "Test file 1 content\nLine 2\nLine 3",
					},
				],
				[
					"file2.js",
					{
						name: "file2.js",
						isDirectory: false,
						size: 512,
						modified: new Date("2023-01-01T12:30:00Z"),
						content: "console.log('Hello, World!');",
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

		return fs;
	}

	private async simulateDelay(): Promise<void> {
		if (this.simulatedDelay > 0) {
			await new Promise((resolve) => setTimeout(resolve, this.simulatedDelay));
		}
	}

	private checkForErrors(path: string): void {
		if (this.options.errorPaths?.has(path)) {
			throw new Error(`Simulated error for path: ${path}`);
		}
		if (this.options.restrictedPaths?.has(path)) {
			throw new Error(`Access denied for path: ${path}`);
		}
	}

	private resolveEntry(path: string): MockFileSystemEntry | null {
		const normalizedPath = this.normalizePath(path);
		const entry = this.fileSystem.get(normalizedPath);

		if (entry) {
			return entry;
		}

		// パスを分解して探す
		const parts = normalizedPath.split("/").filter((part) => part !== "");
		let current = this.fileSystem.get("/");

		if (!current) return null;

		for (const part of parts) {
			if (!current.children?.has(part)) {
				return null;
			}
			current = current.children.get(part)!;
		}

		return current;
	}

	async readDirectory(dirPath: string): Promise<DirectoryReadResult> {
		await this.simulateDelay();

		try {
			this.checkForErrors(dirPath);

			const entry = this.resolveEntry(dirPath);

			if (!entry) {
				return {
					success: false,
					error: `Directory not found: ${dirPath}`,
				};
			}

			if (!entry.isDirectory) {
				return {
					success: false,
					error: `Not a directory: ${dirPath}`,
				};
			}

			const files: FileItem[] = [];
			if (entry.children) {
				for (const [name, child] of Array.from(entry.children)) {
					files.push({
						name,
						isDirectory: child.isDirectory,
						size: child.size,
						modified: child.modified,
					});
				}
			}

			return {
				success: true,
				data: files,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to read directory: ${error}`,
			};
		}
	}

	async readFilePreview(
		filePath: string,
		maxSize: number = 1024 * 1024,
		maxLines: number = 10,
	): Promise<FilePreviewResult> {
		await this.simulateDelay();

		try {
			this.checkForErrors(filePath);

			const entry = this.resolveEntry(filePath);

			if (!entry) {
				return {
					success: false,
					error: `File not found: ${filePath}`,
				};
			}

			if (entry.isDirectory) {
				return {
					success: false,
					error: "Cannot preview directory",
				};
			}

			if (entry.size > maxSize) {
				return {
					success: false,
					error: `File too large (${this.formatBytes(entry.size)} > ${this.formatBytes(maxSize)})`,
				};
			}

			const content = entry.content || "";
			const lines = content.split("\n").slice(0, maxLines);
			const previewContent = lines.join("\n");

			const totalLines = content.split("\n").length;
			const truncatedMessage =
				totalLines > maxLines
					? `\n\n... (${totalLines - maxLines} more lines)`
					: "";

			return {
				success: true,
				data: previewContent + truncatedMessage,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to preview file: ${error}`,
			};
		}
	}

	async pathExists(targetPath: string): Promise<boolean> {
		await this.simulateDelay();

		try {
			this.checkForErrors(targetPath);
			return this.resolveEntry(targetPath) !== null;
		} catch {
			return false;
		}
	}

	async isDirectory(targetPath: string): Promise<boolean> {
		await this.simulateDelay();

		try {
			this.checkForErrors(targetPath);
			const entry = this.resolveEntry(targetPath);
			return entry?.isDirectory || false;
		} catch {
			return false;
		}
	}

	async isFile(targetPath: string): Promise<boolean> {
		await this.simulateDelay();

		try {
			this.checkForErrors(targetPath);
			const entry = this.resolveEntry(targetPath);
			return entry ? !entry.isDirectory : false;
		} catch {
			return false;
		}
	}

	async getFileInfo(filePath: string): Promise<FileInfoResult> {
		await this.simulateDelay();

		try {
			this.checkForErrors(filePath);

			const entry = this.resolveEntry(filePath);

			if (!entry) {
				return {
					success: false,
					error: `File not found: ${filePath}`,
				};
			}

			return {
				success: true,
				data: {
					name: entry.name,
					isDirectory: entry.isDirectory,
					size: entry.size,
					modified: entry.modified,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to get file info: ${error}`,
			};
		}
	}

	async getMultipleFileInfo(filePaths: string[]): Promise<FileItem[]> {
		const promises = filePaths.map(async (filePath) => {
			const result = await this.getFileInfo(filePath);
			return result.success ? result.data : null;
		});

		const results = await Promise.all(promises);
		return results.filter((file): file is FileItem => file !== null);
	}

	private formatBytes(bytes: number): string {
		if (bytes === 0) return "0 B";

		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));

		return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
	}

	private normalizePath(targetPath: string): string {
		// 簡単な正規化（実際のpath.resolveのモック）
		if (targetPath.startsWith("/")) {
			return targetPath;
		}
		return "/" + targetPath;
	}

	// テスト用のヘルパーメソッド
	addFile(path: string, entry: MockFileSystemEntry): void {
		this.fileSystem.set(this.normalizePath(path), entry);
	}

	addDirectory(path: string, entry: MockFileSystemEntry): void {
		if (!entry.children) {
			entry.children = new Map();
		}
		this.fileSystem.set(this.normalizePath(path), entry);
	}

	removeEntry(path: string): void {
		this.fileSystem.delete(this.normalizePath(path));
	}

	setSimulatedDelay(delay: number): void {
		this.simulatedDelay = delay;
	}

	addErrorPath(path: string): void {
		if (!this.options.errorPaths) {
			this.options.errorPaths = new Set();
		}
		this.options.errorPaths.add(path);
	}

	removeErrorPath(path: string): void {
		this.options.errorPaths?.delete(path);
	}

	reset(): void {
		this.fileSystem = this.createDefaultFileSystem();
		this.options.errorPaths?.clear();
		this.options.restrictedPaths?.clear();
	}
}

/**
 * キャッシュ機能付きモックファイルシステムサービス
 */
export class MockCachedFileSystemService
	extends MockFileSystemService
	implements CachedFileSystemService
{
	private cache: Map<string, { data: FileItem[]; timestamp: number }>;
	private cacheSize: number = 0;
	private maxCacheSize: number;

	constructor(options: MockFileSystemOptions = {}) {
		super(options);
		this.cache = new Map();
		this.maxCacheSize = options.maxCacheSize || 100;
	}

	async readDirectoryWithCache(
		dirPath: string,
		ttl: number = 5000,
	): Promise<DirectoryReadResult> {
		// キャッシュから確認
		const cached = this.cache.get(dirPath);
		if (cached && Date.now() - cached.timestamp < ttl) {
			return {
				success: true,
				data: cached.data,
			};
		}

		// キャッシュがない場合は新しく読み取り
		const result = await this.readDirectory(dirPath);

		// 成功した場合はキャッシュに保存
		if (result.success && result.data) {
			this.cache.set(dirPath, {
				data: result.data,
				timestamp: Date.now(),
			});
			this.cacheSize++;

			// キャッシュサイズ制限
			if (this.cacheSize > this.maxCacheSize) {
				const oldestKey = this.cache.keys().next().value;
				if (oldestKey) {
					this.cache.delete(oldestKey);
				}
				this.cacheSize--;
			}
		}

		return result;
	}

	getCacheStats(): { size: number; memoryUsage: number } {
		return {
			size: this.cache.size,
			memoryUsage: this.cache.size * 1024, // 概算
		};
	}

	clearCache(): void {
		this.cache.clear();
		this.cacheSize = 0;
	}
}

/**
 * モックパス操作ユーティリティ
 */
export class MockPathUtilsService implements PathUtilsService {
	getParentDirectory(currentPath: string): string {
		if (currentPath === "/") return "/";
		const parts = currentPath.split("/").filter((part) => part !== "");
		if (parts.length === 0) return "/";
		return "/" + parts.slice(0, -1).join("/");
	}

	normalizePath(targetPath: string): string {
		if (targetPath.startsWith("/")) {
			return targetPath;
		}
		return "/" + targetPath;
	}

	resolveRelativePath(relativePath: string, basePath: string): string {
		if (relativePath.startsWith("/")) {
			return relativePath;
		}
		return basePath + "/" + relativePath;
	}

	isRootDirectory(targetPath: string): boolean {
		return targetPath === "/";
	}

	isSafePath(targetPath: string, basePath: string): boolean {
		const normalizedTarget = this.normalizePath(targetPath);
		const normalizedBase = this.normalizePath(basePath);
		return normalizedTarget.startsWith(normalizedBase);
	}
}

/**
 * モック環境サービス
 */
export class MockEnvironmentService implements EnvironmentService {
	private currentWorkingDirectory: string = "/test";
	private environmentVariables: Map<string, string> = new Map();
	private environment: "development" | "test" | "production" = "test";

	getCurrentWorkingDirectory(): string {
		return this.currentWorkingDirectory;
	}

	getEnvironmentVariable(key: string): string | undefined {
		return this.environmentVariables.get(key);
	}

	getEnvironment(): "development" | "test" | "production" {
		return this.environment;
	}

	// テスト用のヘルパーメソッド
	setCurrentWorkingDirectory(path: string): void {
		this.currentWorkingDirectory = path;
	}

	setEnvironmentVariable(key: string, value: string): void {
		this.environmentVariables.set(key, value);
	}

	setEnvironment(env: "development" | "test" | "production"): void {
		this.environment = env;
	}

	reset(): void {
		this.currentWorkingDirectory = "/test";
		this.environmentVariables.clear();
		this.environment = "test";
	}
}
