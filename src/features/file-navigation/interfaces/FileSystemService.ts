/**
 * ファイルシステムサービスの抽象化
 *
 * テスタビリティを向上させるため、ファイルシステムアクセスを抽象化
 * 実装とテストモックを分離することで、依存性注入を可能にする
 */

import type { FileItem } from "../types/index.js";

/**
 * ファイルシステム操作の結果
 */
export interface FileSystemResult<T> {
	success: boolean;
	data?: T;
	error?: string;
}

/**
 * ディレクトリ読み取り結果
 */
export type DirectoryReadResult = FileSystemResult<FileItem[]>;

/**
 * ファイルプレビュー結果
 */
export type FilePreviewResult = FileSystemResult<string>;

/**
 * ファイル情報取得結果
 */
export type FileInfoResult = FileSystemResult<FileItem>;

/**
 * ファイルシステム操作のインターフェース
 *
 * このインターフェースを実装することで、実際のファイルシステムアクセスと
 * テスト用のモックを同じ契約で扱うことができる
 */
export interface FileSystemService {
	/**
	 * ディレクトリの内容を読み取る
	 * @param dirPath - ディレクトリパス
	 * @returns ディレクトリ内のファイル一覧
	 */
	readDirectory(dirPath: string): Promise<DirectoryReadResult>;

	/**
	 * ファイルの内容をプレビュー用に読み取る
	 * @param filePath - ファイルパス
	 * @param maxSize - 最大サイズ（バイト）
	 * @param maxLines - 最大行数
	 * @returns ファイルの内容（制限付き）
	 */
	readFilePreview(
		filePath: string,
		maxSize?: number,
		maxLines?: number,
	): Promise<FilePreviewResult>;

	/**
	 * パスの存在を確認する
	 * @param targetPath - 確認対象のパス
	 * @returns 存在するかどうか
	 */
	pathExists(targetPath: string): Promise<boolean>;

	/**
	 * パスがディレクトリかどうかを確認する
	 * @param targetPath - 確認対象のパス
	 * @returns ディレクトリかどうか
	 */
	isDirectory(targetPath: string): Promise<boolean>;

	/**
	 * パスがファイルかどうかを確認する
	 * @param targetPath - 確認対象のパス
	 * @returns ファイルかどうか
	 */
	isFile(targetPath: string): Promise<boolean>;

	/**
	 * ファイルの詳細情報を取得する
	 * @param filePath - ファイルパス
	 * @returns ファイル情報
	 */
	getFileInfo(filePath: string): Promise<FileInfoResult>;

	/**
	 * 複数のファイルの詳細情報を並行して取得する
	 * @param filePaths - ファイルパスの配列
	 * @returns ファイル情報の配列
	 */
	getMultipleFileInfo(filePaths: string[]): Promise<FileItem[]>;
}

/**
 * キャッシュ機能付きファイルシステムサービス
 */
export interface CachedFileSystemService extends FileSystemService {
	/**
	 * キャッシュ付きでディレクトリを読み取る
	 * @param dirPath - ディレクトリパス
	 * @param ttl - キャッシュの有効期限（ミリ秒）
	 * @returns ディレクトリ内のファイル一覧
	 */
	readDirectoryWithCache(
		dirPath: string,
		ttl?: number,
	): Promise<DirectoryReadResult>;

	/**
	 * キャッシュの統計情報を取得
	 * @returns キャッシュ統計
	 */
	getCacheStats(): { size: number; memoryUsage: number };

	/**
	 * キャッシュをクリア
	 */
	clearCache(): void;
}

/**
 * パス操作ユーティリティのインターフェース
 */
export interface PathUtilsService {
	/**
	 * 親ディレクトリを取得する
	 * @param currentPath - 現在のパス
	 * @returns 親ディレクトリのパス
	 */
	getParentDirectory(currentPath: string): string;

	/**
	 * パスを正規化する
	 * @param targetPath - 正規化対象のパス
	 * @returns 正規化されたパス
	 */
	normalizePath(targetPath: string): string;

	/**
	 * 相対パスを絶対パスに変換する
	 * @param relativePath - 相対パス
	 * @param basePath - ベースパス
	 * @returns 絶対パス
	 */
	resolveRelativePath(relativePath: string, basePath: string): string;

	/**
	 * パスがルートディレクトリかどうかを確認する
	 * @param targetPath - 確認対象のパス
	 * @returns ルートディレクトリかどうか
	 */
	isRootDirectory(targetPath: string): boolean;

	/**
	 * 安全なパスかどうかを確認する（パストラバーサル攻撃を防ぐ）
	 * @param targetPath - 確認対象のパス
	 * @param basePath - ベースパス
	 * @returns 安全なパスかどうか
	 */
	isSafePath(targetPath: string, basePath: string): boolean;
}

/**
 * ファイルシステムサービスの設定
 */
export interface FileSystemServiceOptions {
	/**
	 * キャッシュの最大サイズ
	 */
	maxCacheSize?: number;

	/**
	 * キャッシュの有効期限（ミリ秒）
	 */
	defaultTtl?: number;

	/**
	 * 最大メモリ使用量（バイト）
	 */
	maxMemoryUsage?: number;

	/**
	 * バッチ処理のサイズ
	 */
	batchSize?: number;

	/**
	 * 最大並列処理数
	 */
	maxConcurrency?: number;

	/**
	 * タイムアウト時間（ミリ秒）
	 */
	timeout?: number;
}

/**
 * 環境情報の取得インターフェース
 */
export interface EnvironmentService {
	/**
	 * 現在の作業ディレクトリを取得
	 * @returns 現在の作業ディレクトリのパス
	 */
	getCurrentWorkingDirectory(): string;

	/**
	 * 環境変数を取得
	 * @param key - 環境変数のキー
	 * @returns 環境変数の値
	 */
	getEnvironmentVariable(key: string): string | undefined;

	/**
	 * 実行環境を取得
	 * @returns 実行環境（'development' | 'test' | 'production'）
	 */
	getEnvironment(): "development" | "test" | "production";
}
