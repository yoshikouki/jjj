/**
 * Node.js implementation of FileSystemService
 * Uses Bun's file system APIs for production
 */

import type { Stats } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { Err, Ok, type Result } from "../../../shared/types/common.js";
import type { FileSystemService } from "../interfaces/FileSystemService.js";
import type { FileItem, FileType } from "../types/index.js";

/**
 * Convert Node.js stats to FileType
 */
const getFileType = (stats: Stats): FileType => {
	if (stats.isDirectory()) return "directory";
	if (stats.isSymbolicLink()) return "symlink";
	if (stats.isFile()) return "file";
	return "unknown";
};

/**
 * Extract file extension
 */
const getExtension = (filename: string): string | undefined => {
	const ext = extname(filename);
	return ext ? ext.slice(1).toLowerCase() : undefined;
};

/**
 * Production implementation using Node.js fs
 */
export class NodeFileSystemService implements FileSystemService {
	async readDirectory(path: string): Promise<Result<readonly FileItem[]>> {
		try {
			const entries = await readdir(path, { withFileTypes: true });
			const files: FileItem[] = [];

			// Add parent directory entry if not at root
			if (path !== "/") {
				const parentResult = this.getParentPath(path);
				if (parentResult.ok) {
					files.push({
						name: "..",
						path: parentResult.value,
						type: "directory",
						size: 0,
						modifiedAt: new Date(),
						isHidden: false,
						isReadable: true,
						isWritable: false,
						isExecutable: true,
					});
				}
			}

			// Process each directory entry
			for (const entry of entries) {
				try {
					const fullPath = join(path, entry.name);
					const stats = await stat(fullPath);

					files.push({
						name: entry.name,
						path: fullPath,
						type: getFileType(stats),
						size: stats.size,
						modifiedAt: stats.mtime,
						isHidden: entry.name.startsWith("."),
						isReadable: true, // Simplified for now
						isWritable: true, // Simplified for now
						isExecutable: stats.mode ? (stats.mode & 0o111) !== 0 : false,
						extension: entry.isFile() ? getExtension(entry.name) : undefined,
					});
				} catch (error) {
					// Skip files we can't access
					console.error(`Failed to stat ${entry.name}:`, error);
				}
			}

			return Ok(files);
		} catch (error) {
			return Err(new Error(`Failed to read directory: ${error}`));
		}
	}

	async getStats(path: string): Promise<Result<FileItem>> {
		try {
			const stats = await stat(path);
			const name = path.split("/").pop() || path;

			return Ok({
				name,
				path,
				type: getFileType(stats),
				size: stats.size,
				modifiedAt: stats.mtime,
				isHidden: name.startsWith("."),
				isReadable: true,
				isWritable: true,
				isExecutable: stats.mode ? (stats.mode & 0o111) !== 0 : false,
				extension: getExtension(name),
			});
		} catch (error) {
			return Err(new Error(`Failed to get stats: ${error}`));
		}
	}

	async exists(path: string): Promise<Result<boolean>> {
		try {
			await stat(path);
			return Ok(true);
		} catch (error: unknown) {
			if (
				error instanceof Error &&
				"code" in error &&
				error.code === "ENOENT"
			) {
				return Ok(false);
			}
			return Err(new Error(`Failed to check existence: ${error}`));
		}
	}

	async isDirectory(path: string): Promise<Result<boolean>> {
		try {
			const stats = await stat(path);
			return Ok(stats.isDirectory());
		} catch (error) {
			return Err(new Error(`Failed to check if directory: ${error}`));
		}
	}

	async readFilePreview(
		path: string,
		maxBytes: number = 1024,
	): Promise<Result<string>> {
		try {
			// Use Bun's file API for better performance
			const file = Bun.file(path);
			const content = await file.text();
			return Ok(content.substring(0, maxBytes));
		} catch (error) {
			return Err(new Error(`Failed to read file: ${error}`));
		}
	}

	async resolvePath(path: string): Promise<Result<string>> {
		try {
			// Handle home directory
			if (path.startsWith("~")) {
				const home = process.env["HOME"] || process.env["USERPROFILE"] || "/";
				path = path.replace("~", home);
			}

			const resolved = resolve(path);
			return Ok(resolved);
		} catch (error) {
			return Err(new Error(`Failed to resolve path: ${error}`));
		}
	}

	getParentPath(path: string): Result<string> {
		if (path === "/" || path === "") {
			return Err(new Error("Already at root"));
		}

		const parent = dirname(path);
		return Ok(parent);
	}

	joinPath(...segments: string[]): string {
		return join(...segments);
	}
}
