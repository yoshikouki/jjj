/**
 * Node.js ファイルシステムサービスの実装
 *
 * FileSystemService インターフェースの実際の実装
 * 本番環境および開発環境で使用される
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
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
import { BatchProcessor } from "../utils/workerPool.js";

// 非同期関数に変換
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

/**
 * LRU キャッシュの実装
 */
class LRUCache<K, V> {
	private capacity: number;
	private cache: Map<K, V>;

	constructor(capacity: number = 100) {
		this.capacity = capacity;
		this.cache = new Map();
	}

	get(key: K): V | undefined {
		const value = this.cache.get(key);
		if (value !== undefined) {
			// LRU: 最近使用されたものを最後に移動
			this.cache.delete(key);
			this.cache.set(key, value);
		}
		return value;
	}

	set(key: K, value: V): void {
		if (this.cache.has(key)) {
			this.cache.delete(key);
		} else if (this.cache.size >= this.capacity) {
			// 最も古いアイテムを削除
			const firstKey = this.cache.keys().next().value;
			this.cache.delete(firstKey);
		}
		this.cache.set(key, value);
	}

	clear(): void {
		this.cache.clear();
	}

	size(): number {
		return this.cache.size;
	}
}

/**
 * 高度なキャッシュ管理
 */
class AdvancedFileSystemCache {
	private cache: LRUCache<
		string,
		{ data: FileItem[]; timestamp: number; hash: string }
	>;
	private memoryUsage: number = 0;
	private maxMemoryUsage: number;
	private cleanupInterval: NodeJS.Timer | null = null;

	constructor(
		capacity: number = 100,
		maxMemoryUsage: number = 50 * 1024 * 1024,
	) {
		this.cache = new LRUCache(capacity);
		this.maxMemoryUsage = maxMemoryUsage;
		this.startCleanupTimer();
	}

	get(dirPath: string, ttl: number = 5000): FileItem[] | null {
		const cached = this.cache.get(dirPath);
		if (cached && Date.now() - cached.timestamp < ttl) {
			return cached.data;
		}
		return null;
	}

	set(dirPath: string, data: FileItem[]): void {
		const hash = this.generateHash(dirPath);
		const entry = { data, timestamp: Date.now(), hash };

		// メモリ使用量を計算
		const entrySize = this.calculateEntrySize(entry);

		// メモリ制限チェック
		if (this.memoryUsage + entrySize > this.maxMemoryUsage) {
			this.evictEntries();
		}

		this.cache.set(dirPath, entry);
		this.memoryUsage += entrySize;
	}

	private generateHash(dirPath: string): string {
		return Buffer.from(dirPath).toString("base64");
	}

	private calculateEntrySize(entry: {
		data: FileItem[];
		timestamp: number;
		hash: string;
	}): number {
		// 大まかなサイズ計算
		return JSON.stringify(entry).length * 2; // UTF-16 文字エンコーディングの概算
	}

	private evictEntries(): void {
		const entries = Array.from(this.cache.cache.entries());
		const sortedEntries = entries.sort(
			(a, b) => a[1].timestamp - b[1].timestamp,
		);

		// 古いエントリの半分を削除
		const toRemove = Math.floor(sortedEntries.length / 2);
		for (let i = 0; i < toRemove; i++) {
			this.cache.cache.delete(sortedEntries[i][0]);
		}

		// メモリ使用量をリセット
		this.memoryUsage = 0;
		for (const [, value] of this.cache.cache) {
			this.memoryUsage += this.calculateEntrySize(value);
		}
	}

	private startCleanupTimer(): void {
		this.cleanupInterval = setInterval(() => {
			this.cleanupExpiredEntries();
		}, 60000); // 1分ごとにクリーンアップ
	}

	private cleanupExpiredEntries(): void {
		const now = Date.now();
		const ttl = 300000; // 5分

		for (const [key, value] of this.cache.cache) {
			if (now - value.timestamp > ttl) {
				this.cache.cache.delete(key);
			}
		}
	}

	clear(): void {
		this.cache.clear();
		this.memoryUsage = 0;
	}

	getStats(): { size: number; memoryUsage: number } {
		return {
			size: this.cache.size(),
			memoryUsage: this.memoryUsage,
		};
	}

	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
		this.clear();
	}
}

/**
 * Node.js ファイルシステムサービスの実装
 */
export class NodeFileSystemService implements FileSystemService {
	private options: FileSystemServiceOptions;

	constructor(options: FileSystemServiceOptions = {}) {
		this.options = {
			maxCacheSize: 100,
			defaultTtl: 5000,
			maxMemoryUsage: 50 * 1024 * 1024,
			batchSize: 50,
			maxConcurrency: 4,
			timeout: 10000,
			...options,
		};
	}

	async readDirectory(dirPath: string): Promise<DirectoryReadResult> {
		try {
			// ディレクトリの存在とアクセス権限を確認
			await access(dirPath, fs.constants.R_OK);

			// ディレクトリの内容を読み取り
			const entries = await readdir(dirPath);

			// 大きなディレクトリの場合はバッチ処理を使用
			if (entries.length > this.options.batchSize!) {
				return await this.readDirectoryInBatches(dirPath, entries);
			}

			// 各エントリの詳細情報を並行して取得
			const filePromises = entries.map(
				async (name): Promise<FileItem | null> => {
					try {
						const fullPath = path.join(dirPath, name);
						const stats = await stat(fullPath);

						return {
							name,
							isDirectory: stats.isDirectory(),
							size: stats.size,
							modified: stats.mtime,
						};
					} catch (error) {
						// 個別のファイルでエラーが発生した場合はnullを返す
						console.warn(`Failed to read file stats for ${name}:`, error);
						return null;
					}
				},
			);

			// すべてのファイル情報を並行して取得
			const fileResults = await Promise.all(filePromises);

			// nullを除外してFileItemのみを返す
			const files = fileResults.filter(
				(file): file is FileItem => file !== null,
			);

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

	private async readDirectoryInBatches(
		dirPath: string,
		entries: string[],
	): Promise<DirectoryReadResult> {
		const batchProcessor = new BatchProcessor(
			this.options.batchSize!,
			this.options.maxConcurrency!,
		);

		try {
			const files = await batchProcessor.processInBatches(
				entries,
				async (batch: string[]): Promise<FileItem[]> => {
					const batchPromises = batch.map(
						async (name): Promise<FileItem | null> => {
							try {
								const fullPath = path.join(dirPath, name);
								const stats = await stat(fullPath);

								return {
									name,
									isDirectory: stats.isDirectory(),
									size: stats.size,
									modified: stats.mtime,
								};
							} catch (error) {
								console.warn(`Failed to read file stats for ${name}:`, error);
								return null;
							}
						},
					);

					const batchResults = await Promise.all(batchPromises);
					return batchResults.filter((file): file is FileItem => file !== null);
				},
			);

			return {
				success: true,
				data: files,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to read directory in batches: ${error}`,
			};
		}
	}

	async readFilePreview(
		filePath: string,
		maxSize: number = 1024 * 1024,
		maxLines: number = 10,
	): Promise<FilePreviewResult> {
		try {
			// ファイルの存在とアクセス権限を確認
			await access(filePath, fs.constants.R_OK);

			// ファイル情報を取得
			const stats = await stat(filePath);

			// ディレクトリの場合はエラー
			if (stats.isDirectory()) {
				return {
					success: false,
					error: "Cannot preview directory",
				};
			}

			// ファイルサイズが大きすぎる場合
			if (stats.size > maxSize) {
				return {
					success: false,
					error: `File too large (${this.formatBytes(stats.size)} > ${this.formatBytes(maxSize)})`,
				};
			}

			// ファイルの内容を読み取り
			const content = await readFile(filePath, "utf-8");

			// 指定された行数まで制限
			const lines = content.split("\n").slice(0, maxLines);
			const previewContent = lines.join("\n");

			// 切り詰められた場合はその旨を付け加える
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
		try {
			await access(targetPath, fs.constants.F_OK);
			return true;
		} catch {
			return false;
		}
	}

	async isDirectory(targetPath: string): Promise<boolean> {
		try {
			const stats = await stat(targetPath);
			return stats.isDirectory();
		} catch {
			return false;
		}
	}

	async isFile(targetPath: string): Promise<boolean> {
		try {
			const stats = await stat(targetPath);
			return stats.isFile();
		} catch {
			return false;
		}
	}

	async getFileInfo(filePath: string): Promise<FileInfoResult> {
		try {
			const stats = await stat(filePath);
			const name = path.basename(filePath);

			return {
				success: true,
				data: {
					name,
					isDirectory: stats.isDirectory(),
					size: stats.size,
					modified: stats.mtime,
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
}

/**
 * キャッシュ機能付きファイルシステムサービス
 */
export class CachedNodeFileSystemService
	extends NodeFileSystemService
	implements CachedFileSystemService
{
	private cache: AdvancedFileSystemCache;

	constructor(options: FileSystemServiceOptions = {}) {
		super(options);
		this.cache = new AdvancedFileSystemCache(
			options.maxCacheSize,
			options.maxMemoryUsage,
		);
	}

	async readDirectoryWithCache(
		dirPath: string,
		ttl: number = this.options.defaultTtl!,
	): Promise<DirectoryReadResult> {
		// キャッシュから確認
		const cached = this.cache.get(dirPath, ttl);
		if (cached) {
			return {
				success: true,
				data: cached,
			};
		}

		// キャッシュがない場合は新しく読み取り
		const result = await this.readDirectory(dirPath);

		// 成功した場合はキャッシュに保存
		if (result.success && result.data) {
			this.cache.set(dirPath, result.data);
		}

		return result;
	}

	getCacheStats(): { size: number; memoryUsage: number } {
		return this.cache.getStats();
	}

	clearCache(): void {
		this.cache.clear();
	}

	destroy(): void {
		this.cache.destroy();
	}
}

/**
 * パス操作ユーティリティの実装
 */
export class NodePathUtilsService implements PathUtilsService {
	getParentDirectory(currentPath: string): string {
		return path.dirname(currentPath);
	}

	normalizePath(targetPath: string): string {
		return path.resolve(targetPath);
	}

	resolveRelativePath(relativePath: string, basePath: string): string {
		return path.resolve(basePath, relativePath);
	}

	isRootDirectory(targetPath: string): boolean {
		return path.resolve(targetPath) === path.parse(targetPath).root;
	}

	isSafePath(targetPath: string, basePath: string): boolean {
		const normalizedTarget = path.resolve(targetPath);
		const normalizedBase = path.resolve(basePath);

		return normalizedTarget.startsWith(normalizedBase);
	}
}

/**
 * 環境サービスの実装
 */
export class NodeEnvironmentService implements EnvironmentService {
	getCurrentWorkingDirectory(): string {
		return process.cwd();
	}

	getEnvironmentVariable(key: string): string | undefined {
		return process.env[key];
	}

	getEnvironment(): "development" | "test" | "production" {
		const env = process.env.NODE_ENV;
		if (env === "test") return "test";
		if (env === "production") return "production";
		return "development";
	}
}
