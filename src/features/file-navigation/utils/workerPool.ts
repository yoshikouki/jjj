/**
 * ワーカープールの実装
 *
 * CPU集約的な処理やファイル操作を効率的に並列実行
 */

import { cpus } from "node:os";
import { isMainThread, parentPort, Worker } from "node:worker_threads";
import type { FileItem } from "../types/index.js";

/**
 * ワーカータスクの定義
 */
export interface WorkerTask<T = any, R = any> {
	id: string;
	type: string;
	data: T;
	resolve: (value: R) => void;
	reject: (error: Error) => void;
}

/**
 * ワーカープールの設定
 */
export interface WorkerPoolOptions {
	maxWorkers?: number;
	taskTimeout?: number;
	workerScript?: string;
}

/**
 * ワーカープールクラス
 */
export class WorkerPool {
	private workers: Worker[] = [];
	private tasks: WorkerTask[] = [];
	private activeTasks: Map<string, WorkerTask> = new Map();
	private availableWorkers: Worker[] = [];
	private maxWorkers: number;
	private taskTimeout: number;
	private workerScript: string;

	constructor(options: WorkerPoolOptions = {}) {
		this.maxWorkers = options.maxWorkers || Math.max(1, cpus().length - 1);
		this.taskTimeout = options.taskTimeout || 10000; // 10秒
		this.workerScript = options.workerScript || __filename;
	}

	/**
	 * ワーカープールを初期化
	 */
	async initialize(): Promise<void> {
		for (let i = 0; i < this.maxWorkers; i++) {
			const worker = new Worker(this.workerScript);

			worker.on("message", (result) => {
				const { taskId, data, error } = result;
				const task = this.activeTasks.get(taskId);

				if (task) {
					this.activeTasks.delete(taskId);
					this.availableWorkers.push(worker);

					if (error) {
						task.reject(new Error(error));
					} else {
						task.resolve(data);
					}

					// 次のタスクを処理
					this.processNextTask();
				}
			});

			worker.on("error", (error) => {
				console.error("Worker error:", error);
				this.restartWorker(worker);
			});

			this.workers.push(worker);
			this.availableWorkers.push(worker);
		}
	}

	/**
	 * タスクをワーカープールに投入
	 */
	async execute<T, R>(type: string, data: T): Promise<R> {
		return new Promise((resolve, reject) => {
			const task: WorkerTask<T, R> = {
				id: this.generateTaskId(),
				type,
				data,
				resolve,
				reject,
			};

			this.tasks.push(task);
			this.processNextTask();

			// タイムアウト処理
			setTimeout(() => {
				if (this.activeTasks.has(task.id)) {
					this.activeTasks.delete(task.id);
					task.reject(new Error("Task timeout"));
				}
			}, this.taskTimeout);
		});
	}

	/**
	 * 次のタスクを処理
	 */
	private processNextTask(): void {
		if (this.tasks.length === 0 || this.availableWorkers.length === 0) {
			return;
		}

		const task = this.tasks.shift()!;
		const worker = this.availableWorkers.pop()!;

		this.activeTasks.set(task.id, task);

		worker.postMessage({
			taskId: task.id,
			type: task.type,
			data: task.data,
		});
	}

	/**
	 * ワーカーを再起動
	 */
	private restartWorker(failedWorker: Worker): void {
		const index = this.workers.indexOf(failedWorker);
		if (index !== -1) {
			failedWorker.terminate();

			const newWorker = new Worker(this.workerScript);
			this.workers[index] = newWorker;
			this.availableWorkers.push(newWorker);
		}
	}

	/**
	 * タスクIDを生成
	 */
	private generateTaskId(): string {
		return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * ワーカープールを終了
	 */
	async terminate(): Promise<void> {
		await Promise.all(this.workers.map((worker) => worker.terminate()));
		this.workers = [];
		this.availableWorkers = [];
		this.tasks = [];
		this.activeTasks.clear();
	}
}

/**
 * ワーカー処理の実装
 */
if (!isMainThread) {
	parentPort?.on("message", async (message) => {
		const { taskId, type, data } = message;

		try {
			let result;

			switch (type) {
				case "sort-files":
					result = await sortFilesWorker(data);
					break;
				case "filter-files":
					result = await filterFilesWorker(data);
					break;
				case "search-files":
					result = await searchFilesWorker(data);
					break;
				case "format-files":
					result = await formatFilesWorker(data);
					break;
				default:
					throw new Error(`Unknown task type: ${type}`);
			}

			parentPort?.postMessage({ taskId, data: result });
		} catch (error) {
			parentPort?.postMessage({
				taskId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	});
}

/**
 * ファイルソート処理（ワーカー用）
 */
async function sortFilesWorker(data: {
	files: FileItem[];
	sortBy: string;
	order: "asc" | "desc";
}): Promise<FileItem[]> {
	const { files, sortBy, order } = data;

	return files.sort((a, b) => {
		let comparison = 0;

		switch (sortBy) {
			case "name":
				comparison = a.name.localeCompare(b.name);
				break;
			case "size":
				comparison = a.size - b.size;
				break;
			case "modified":
				comparison = a.modified.getTime() - b.modified.getTime();
				break;
			case "type":
				comparison =
					a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1;
				break;
			default:
				return 0;
		}

		return order === "desc" ? -comparison : comparison;
	});
}

/**
 * ファイルフィルタリング処理（ワーカー用）
 */
async function filterFilesWorker(data: {
	files: FileItem[];
	filters: any;
}): Promise<FileItem[]> {
	const { files, filters } = data;

	return files.filter((file) => {
		// 隠しファイルのフィルタリング
		if (
			!filters.showHidden &&
			file.name.startsWith(".") &&
			file.name !== ".."
		) {
			return false;
		}

		// 名前でのフィルタリング
		if (
			filters.nameFilter &&
			!file.name.toLowerCase().includes(filters.nameFilter.toLowerCase())
		) {
			return false;
		}

		// サイズでのフィルタリング
		if (filters.minSize !== undefined && file.size < filters.minSize) {
			return false;
		}

		if (filters.maxSize !== undefined && file.size > filters.maxSize) {
			return false;
		}

		// 日付でのフィルタリング
		if (filters.afterDate && file.modified < filters.afterDate) {
			return false;
		}

		if (filters.beforeDate && file.modified > filters.beforeDate) {
			return false;
		}

		return true;
	});
}

/**
 * ファイル検索処理（ワーカー用）
 */
async function searchFilesWorker(data: {
	files: FileItem[];
	query: string;
	options: any;
}): Promise<FileItem[]> {
	const { files, query, options } = data;

	if (!query.trim()) {
		return files;
	}

	const lowerQuery = query.toLowerCase();

	return files.filter((file) => {
		const fileName = file.name.toLowerCase();

		if (options.exactMatch) {
			return fileName === lowerQuery;
		}

		if (options.regexMode) {
			try {
				const regex = new RegExp(query, options.caseSensitive ? "g" : "gi");
				return regex.test(file.name);
			} catch {
				return false;
			}
		}

		return fileName.includes(lowerQuery);
	});
}

/**
 * ファイルフォーマット処理（ワーカー用）
 */
async function formatFilesWorker(data: {
	files: FileItem[];
	format: string;
}): Promise<any[]> {
	const { files, format } = data;

	return files.map((file) => {
		switch (format) {
			case "detailed":
				return {
					name: file.name,
					type: file.isDirectory ? "directory" : "file",
					size: file.size,
					modified: file.modified.toISOString(),
					formattedSize: formatFileSize(file.size),
					formattedDate: formatRelativeDate(file.modified),
				};
			case "compact":
				return {
					name: file.name,
					isDirectory: file.isDirectory,
				};
			default:
				return file;
		}
	});
}

/**
 * ファイルサイズをフォーマット
 */
function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";

	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}

/**
 * 相対日時をフォーマット
 */
function formatRelativeDate(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 7) return `${diffDays} days ago`;
	if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
	if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

	return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * グローバルワーカープールインスタンス
 */
let globalWorkerPool: WorkerPool | null = null;

/**
 * グローバルワーカープールを取得
 */
export function getWorkerPool(): WorkerPool {
	if (!globalWorkerPool) {
		globalWorkerPool = new WorkerPool();
	}
	return globalWorkerPool;
}

/**
 * 並列処理ヘルパー
 */
export class ParallelProcessor {
	private workerPool: WorkerPool;

	constructor(workerPool?: WorkerPool) {
		this.workerPool = workerPool || getWorkerPool();
	}

	/**
	 * 並列でファイルをソート
	 */
	async sortFiles(
		files: FileItem[],
		sortBy: string,
		order: "asc" | "desc" = "asc",
	): Promise<FileItem[]> {
		if (files.length < 100) {
			// 少数のファイルは同期処理
			return files.sort((a, b) => {
				let comparison = 0;

				switch (sortBy) {
					case "name":
						comparison = a.name.localeCompare(b.name);
						break;
					case "size":
						comparison = a.size - b.size;
						break;
					case "modified":
						comparison = a.modified.getTime() - b.modified.getTime();
						break;
					case "type":
						comparison =
							a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1;
						break;
					default:
						return 0;
				}

				return order === "desc" ? -comparison : comparison;
			});
		}

		return this.workerPool.execute("sort-files", { files, sortBy, order });
	}

	/**
	 * 並列でファイルをフィルター
	 */
	async filterFiles(files: FileItem[], filters: any): Promise<FileItem[]> {
		if (files.length < 100) {
			// 少数のファイルは同期処理
			return files.filter((file) => {
				if (
					!filters.showHidden &&
					file.name.startsWith(".") &&
					file.name !== ".."
				) {
					return false;
				}

				if (
					filters.nameFilter &&
					!file.name.toLowerCase().includes(filters.nameFilter.toLowerCase())
				) {
					return false;
				}

				return true;
			});
		}

		return this.workerPool.execute("filter-files", { files, filters });
	}

	/**
	 * 並列でファイルを検索
	 */
	async searchFiles(
		files: FileItem[],
		query: string,
		options: any = {},
	): Promise<FileItem[]> {
		if (files.length < 100) {
			// 少数のファイルは同期処理
			const lowerQuery = query.toLowerCase();
			return files.filter((file) =>
				file.name.toLowerCase().includes(lowerQuery),
			);
		}

		return this.workerPool.execute("search-files", { files, query, options });
	}

	/**
	 * 並列でファイルをフォーマット
	 */
	async formatFiles(files: FileItem[], format: string): Promise<any[]> {
		if (files.length < 100) {
			// 少数のファイルは同期処理
			return files.map((file) => {
				switch (format) {
					case "detailed":
						return {
							name: file.name,
							type: file.isDirectory ? "directory" : "file",
							size: file.size,
							modified: file.modified.toISOString(),
						};
					case "compact":
						return {
							name: file.name,
							isDirectory: file.isDirectory,
						};
					default:
						return file;
				}
			});
		}

		return this.workerPool.execute("format-files", { files, format });
	}
}

/**
 * バッチ処理ヘルパー
 */
export class BatchProcessor {
	private batchSize: number;
	private maxConcurrency: number;

	constructor(batchSize: number = 100, maxConcurrency: number = 4) {
		this.batchSize = batchSize;
		this.maxConcurrency = maxConcurrency;
	}

	/**
	 * 配列をバッチ処理
	 */
	async processInBatches<T, R>(
		items: T[],
		processor: (batch: T[]) => Promise<R[]>,
		onProgress?: (processed: number, total: number) => void,
	): Promise<R[]> {
		const batches: T[][] = [];
		for (let i = 0; i < items.length; i += this.batchSize) {
			batches.push(items.slice(i, i + this.batchSize));
		}

		const results: R[] = [];
		let processed = 0;

		for (let i = 0; i < batches.length; i += this.maxConcurrency) {
			const currentBatches = batches.slice(i, i + this.maxConcurrency);
			const batchPromises = currentBatches.map((batch) => processor(batch));

			const batchResults = await Promise.all(batchPromises);

			for (const batchResult of batchResults) {
				results.push(...batchResult);
				processed += batchResult.length;

				if (onProgress) {
					onProgress(processed, items.length);
				}
			}
		}

		return results;
	}
}

/**
 * 非同期キューの実装
 */
export class AsyncQueue<T> {
	private queue: T[] = [];
	private processing = false;
	private processor: (item: T) => Promise<void>;
	private concurrency: number;
	private running = 0;

	constructor(processor: (item: T) => Promise<void>, concurrency: number = 1) {
		this.processor = processor;
		this.concurrency = concurrency;
	}

	/**
	 * キューにアイテムを追加
	 */
	enqueue(item: T): void {
		this.queue.push(item);
		this.processQueue();
	}

	/**
	 * キューを処理
	 */
	private async processQueue(): Promise<void> {
		if (this.running >= this.concurrency) {
			return;
		}

		const item = this.queue.shift();
		if (!item) {
			return;
		}

		this.running++;

		try {
			await this.processor(item);
		} catch (error) {
			console.error("Queue processing error:", error);
		} finally {
			this.running--;

			if (this.queue.length > 0) {
				this.processQueue();
			}
		}
	}

	/**
	 * キューのサイズを取得
	 */
	size(): number {
		return this.queue.length;
	}

	/**
	 * キューをクリア
	 */
	clear(): void {
		this.queue = [];
	}
}
