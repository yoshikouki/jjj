/**
 * FileSystem Service Interface
 * Abstraction for file system operations following Dependency Inversion Principle
 */

import type { Result } from "../../../shared/types/common.js";
import type { FileItem } from "../types/index.js";

/**
 * File system service interface
 * All operations return Result type for explicit error handling
 */
export interface FileSystemService {
	/**
	 * Read directory contents
	 * @param path - Directory path to read
	 * @returns Result containing array of FileItems or error
	 */
	readDirectory(path: string): Promise<Result<readonly FileItem[]>>;

	/**
	 * Get file/directory statistics
	 * @param path - Path to get stats for
	 * @returns Result containing FileItem or error
	 */
	getStats(path: string): Promise<Result<FileItem>>;

	/**
	 * Check if path exists
	 * @param path - Path to check
	 * @returns Result containing boolean or error
	 */
	exists(path: string): Promise<Result<boolean>>;

	/**
	 * Check if path is a directory
	 * @param path - Path to check
	 * @returns Result containing boolean or error
	 */
	isDirectory(path: string): Promise<Result<boolean>>;

	/**
	 * Read file content preview
	 * @param path - File path to read
	 * @param maxBytes - Maximum bytes to read (default: 1024)
	 * @returns Result containing file content or error
	 */
	readFilePreview(path: string, maxBytes?: number): Promise<Result<string>>;

	/**
	 * Resolve absolute path
	 * @param path - Path to resolve
	 * @returns Result containing resolved path or error
	 */
	resolvePath(path: string): Promise<Result<string>>;

	/**
	 * Get parent directory path
	 * @param path - Current path
	 * @returns Result containing parent path or error
	 */
	getParentPath(path: string): Result<string>;

	/**
	 * Join path segments
	 * @param segments - Path segments to join
	 * @returns Joined path
	 */
	joinPath(...segments: string[]): string;
}
