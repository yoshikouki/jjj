/**
 * 非同期ファイルシステムサービス
 *
 * ファイルシステム操作を非同期で実行し、UIをブロックしないようにする
 * 全ての操作は結果オブジェクトで統一されたエラーハンドリングを提供
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import type {
	DirectoryReadResult,
	FileItem,
	FilePreviewResult,
} from "../types/index.js";

// 非同期関数に変換
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

/**
 * ディレクトリの内容を非同期で読み取る
 *
 * @param dirPath - ディレクトリパス
 * @returns ディレクトリ読み取り結果
 */
export const readDirectory = async (
	dirPath: string,
): Promise<DirectoryReadResult> => {
	try {
		// ディレクトリの存在とアクセス権限を確認
		await access(dirPath, fs.constants.R_OK);

		// ディレクトリの内容を読み取り
		const entries = await readdir(dirPath);

		// 各エントリの詳細情報を並行して取得
		const filePromises = entries.map(async (name): Promise<FileItem | null> => {
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
		});

		// すべてのファイル情報を並行して取得
		const fileResults = await Promise.all(filePromises);

		// nullを除外してFileItemのみを返す
		const files = fileResults.filter((file): file is FileItem => file !== null);

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
};

/**
 * ファイルの内容を非同期でプレビュー用に読み取る
 *
 * @param filePath - ファイルパス
 * @param maxSize - 最大サイズ（バイト）
 * @param maxLines - 最大行数
 * @returns ファイルプレビュー結果
 */
export const readFilePreview = async (
	filePath: string,
	maxSize: number = 1024 * 1024, // 1MB
	maxLines: number = 10,
): Promise<FilePreviewResult> => {
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
				error: `File too large (${formatBytes(stats.size)} > ${formatBytes(maxSize)})`,
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
};

/**
 * パスの存在を非同期で確認する
 *
 * @param targetPath - 確認対象のパス
 * @returns 存在するかどうか
 */
export const pathExists = async (targetPath: string): Promise<boolean> => {
	try {
		await access(targetPath, fs.constants.F_OK);
		return true;
	} catch {
		return false;
	}
};

/**
 * パスがディレクトリかどうかを非同期で確認する
 *
 * @param targetPath - 確認対象のパス
 * @returns ディレクトリかどうか
 */
export const isDirectory = async (targetPath: string): Promise<boolean> => {
	try {
		const stats = await stat(targetPath);
		return stats.isDirectory();
	} catch {
		return false;
	}
};

/**
 * パスがファイルかどうかを非同期で確認する
 *
 * @param targetPath - 確認対象のパス
 * @returns ファイルかどうか
 */
export const isFile = async (targetPath: string): Promise<boolean> => {
	try {
		const stats = await stat(targetPath);
		return stats.isFile();
	} catch {
		return false;
	}
};

/**
 * 親ディレクトリを取得する
 *
 * @param currentPath - 現在のパス
 * @returns 親ディレクトリのパス
 */
export const getParentDirectory = (currentPath: string): string => {
	return path.dirname(currentPath);
};

/**
 * パスを正規化する
 *
 * @param targetPath - 正規化対象のパス
 * @returns 正規化されたパス
 */
export const normalizePath = (targetPath: string): string => {
	return path.resolve(targetPath);
};

/**
 * 相対パスを絶対パスに変換する
 *
 * @param relativePath - 相対パス
 * @param basePath - ベースパス
 * @returns 絶対パス
 */
export const resolveRelativePath = (
	relativePath: string,
	basePath: string,
): string => {
	return path.resolve(basePath, relativePath);
};

/**
 * パスがルートディレクトリかどうかを確認する
 *
 * @param targetPath - 確認対象のパス
 * @returns ルートディレクトリかどうか
 */
export const isRootDirectory = (targetPath: string): boolean => {
	return path.resolve(targetPath) === path.parse(targetPath).root;
};

/**
 * 安全なパスかどうかを確認する（パストラバーサル攻撃を防ぐ）
 *
 * @param targetPath - 確認対象のパス
 * @param basePath - ベースパス
 * @returns 安全なパスかどうか
 */
export const isSafePath = (targetPath: string, basePath: string): boolean => {
	const normalizedTarget = path.resolve(targetPath);
	const normalizedBase = path.resolve(basePath);

	return normalizedTarget.startsWith(normalizedBase);
};

/**
 * ファイルの詳細情報を非同期で取得する
 *
 * @param filePath - ファイルパス
 * @returns ファイル情報
 */
export const getFileInfo = async (
	filePath: string,
): Promise<FileItem | null> => {
	try {
		const stats = await stat(filePath);
		const name = path.basename(filePath);

		return {
			name,
			isDirectory: stats.isDirectory(),
			size: stats.size,
			modified: stats.mtime,
		};
	} catch {
		return null;
	}
};

/**
 * 複数のファイルの詳細情報を並行して取得する
 *
 * @param filePaths - ファイルパスの配列
 * @returns ファイル情報の配列
 */
export const getMultipleFileInfo = async (
	filePaths: string[],
): Promise<FileItem[]> => {
	const promises = filePaths.map(getFileInfo);
	const results = await Promise.all(promises);

	return results.filter((file): file is FileItem => file !== null);
};

/**
 * ディレクトリの内容をキャッシュ付きで読み取る
 *
 * @param dirPath - ディレクトリパス
 * @param cache - キャッシュオブジェクト
 * @param ttl - キャッシュの有効期限（ミリ秒）
 * @returns ディレクトリ読み取り結果
 */
export const readDirectoryWithCache = async (
	dirPath: string,
	cache: Map<string, { data: FileItem[]; timestamp: number }>,
	ttl: number = 5000, // 5秒
): Promise<DirectoryReadResult> => {
	// キャッシュから確認
	const cached = cache.get(dirPath);
	if (cached && Date.now() - cached.timestamp < ttl) {
		return {
			success: true,
			data: cached.data,
		};
	}

	// キャッシュがない場合は新しく読み取り
	const result = await readDirectory(dirPath);

	// 成功した場合はキャッシュに保存
	if (result.success && result.data) {
		cache.set(dirPath, {
			data: result.data,
			timestamp: Date.now(),
		});
	}

	return result;
};

/**
 * バイト数を人間が読みやすい形式に変換する補助関数
 *
 * @param bytes - バイト数
 * @returns フォーマットされたサイズ
 */
const formatBytes = (bytes: number): string => {
	if (bytes === 0) return "0 B";

	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
};

/**
 * ファイルシステム操作の遅延実行（デバウンス）
 *
 * @param fn - 実行する関数
 * @param delay - 遅延時間（ミリ秒）
 * @returns デバウンスされた関数
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
	fn: T,
	delay: number,
): ((...args: Parameters<T>) => void) => {
	let timeoutId: NodeJS.Timeout | null = null;

	return (...args: Parameters<T>) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			fn(...args);
		}, delay);
	};
};

/**
 * 非同期操作のタイムアウト処理
 *
 * @param promise - 実行する非同期処理
 * @param timeout - タイムアウト時間（ミリ秒）
 * @returns タイムアウト機能付きの非同期処理
 */
export const withTimeout = <T>(
	promise: Promise<T>,
	timeout: number,
): Promise<T> => {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) => {
			setTimeout(() => reject(new Error("Operation timed out")), timeout);
		}),
	]);
};
