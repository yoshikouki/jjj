/**
 * Mock implementation of FileSystemService for testing
 * Provides predictable, deterministic behavior
 */

import { Err, Ok, type Result } from "../../../shared/types/common.js";
import type { FileSystemService } from "../interfaces/FileSystemService.js";
import type { FileItem } from "../types/index.js";

/**
 * Mock file system data
 */
const mockFileSystem: Record<string, FileItem[]> = {
	"/home/user": [
		{
			name: "..",
			path: "/home",
			type: "directory",
			size: 4096,
			modifiedAt: new Date("2024-01-01"),
			isHidden: false,
			isReadable: true,
			isWritable: true,
			isExecutable: true,
		},
		{
			name: "Documents",
			path: "/home/user/Documents",
			type: "directory",
			size: 4096,
			modifiedAt: new Date("2024-01-15"),
			isHidden: false,
			isReadable: true,
			isWritable: true,
			isExecutable: true,
		},
		{
			name: "Downloads",
			path: "/home/user/Downloads",
			type: "directory",
			size: 4096,
			modifiedAt: new Date("2024-01-20"),
			isHidden: false,
			isReadable: true,
			isWritable: true,
			isExecutable: true,
		},
		{
			name: ".config",
			path: "/home/user/.config",
			type: "directory",
			size: 4096,
			modifiedAt: new Date("2024-01-10"),
			isHidden: true,
			isReadable: true,
			isWritable: true,
			isExecutable: true,
		},
		{
			name: "README.md",
			path: "/home/user/README.md",
			type: "file",
			size: 1234,
			modifiedAt: new Date("2024-01-25"),
			isHidden: false,
			isReadable: true,
			isWritable: true,
			isExecutable: false,
			extension: "md",
		},
		{
			name: "script.js",
			path: "/home/user/script.js",
			type: "file",
			size: 5678,
			modifiedAt: new Date("2024-01-22"),
			isHidden: false,
			isReadable: true,
			isWritable: true,
			isExecutable: true,
			extension: "js",
		},
	],
	"/home/user/Documents": [
		{
			name: "..",
			path: "/home/user",
			type: "directory",
			size: 4096,
			modifiedAt: new Date("2024-01-01"),
			isHidden: false,
			isReadable: true,
			isWritable: true,
			isExecutable: true,
		},
		{
			name: "report.pdf",
			path: "/home/user/Documents/report.pdf",
			type: "file",
			size: 123456,
			modifiedAt: new Date("2024-01-18"),
			isHidden: false,
			isReadable: true,
			isWritable: true,
			isExecutable: false,
			extension: "pdf",
		},
		{
			name: "notes.txt",
			path: "/home/user/Documents/notes.txt",
			type: "file",
			size: 2048,
			modifiedAt: new Date("2024-01-16"),
			isHidden: false,
			isReadable: true,
			isWritable: true,
			isExecutable: false,
			extension: "txt",
		},
	],
};

/**
 * Mock file content
 */
const mockFileContent: Record<string, string> = {
	"/home/user/README.md":
		"# Mock Project\n\nThis is a mock README file for testing.",
	"/home/user/script.js": "console.log('Hello from mock file!');",
	"/home/user/Documents/notes.txt":
		"These are some mock notes.\nLine 2 of notes.",
};

/**
 * Mock implementation for testing
 */
export class MockFileSystemService implements FileSystemService {
	private delay: number;
	private shouldFail: boolean;

	constructor(options?: { delay?: number; shouldFail?: boolean }) {
		this.delay = options?.delay ?? 0;
		this.shouldFail = options?.shouldFail ?? false;
	}

	async readDirectory(path: string): Promise<Result<readonly FileItem[]>> {
		await this.simulateDelay();

		if (this.shouldFail) {
			return Err(new Error("Mock error: Failed to read directory"));
		}

		const files = mockFileSystem[path];
		if (!files) {
			return Err(new Error(`Directory not found: ${path}`));
		}

		return Ok(files);
	}

	async getStats(path: string): Promise<Result<FileItem>> {
		await this.simulateDelay();

		if (this.shouldFail) {
			return Err(new Error("Mock error: Failed to get stats"));
		}

		// Find file in mock system
		for (const files of Object.values(mockFileSystem)) {
			const file = files.find((f) => f.path === path);
			if (file) {
				return Ok(file);
			}
		}

		return Err(new Error(`File not found: ${path}`));
	}

	async exists(path: string): Promise<Result<boolean>> {
		await this.simulateDelay();

		if (this.shouldFail) {
			return Err(new Error("Mock error: Failed to check existence"));
		}

		// Check if path exists in mock system
		if (mockFileSystem[path]) {
			return Ok(true);
		}

		// Check if it's a file
		for (const files of Object.values(mockFileSystem)) {
			if (files.some((f) => f.path === path)) {
				return Ok(true);
			}
		}

		return Ok(false);
	}

	async isDirectory(path: string): Promise<Result<boolean>> {
		await this.simulateDelay();

		if (this.shouldFail) {
			return Err(new Error("Mock error: Failed to check directory"));
		}

		return Ok(!!mockFileSystem[path]);
	}

	async readFilePreview(
		path: string,
		maxBytes: number = 1024,
	): Promise<Result<string>> {
		await this.simulateDelay();

		if (this.shouldFail) {
			return Err(new Error("Mock error: Failed to read file"));
		}

		const content = mockFileContent[path];
		if (!content) {
			return Err(new Error(`File not found: ${path}`));
		}

		return Ok(content.substring(0, maxBytes));
	}

	async resolvePath(path: string): Promise<Result<string>> {
		await this.simulateDelay();

		if (this.shouldFail) {
			return Err(new Error("Mock error: Failed to resolve path"));
		}

		// Simple mock resolution
		if (path.startsWith("~")) {
			return Ok(path.replace("~", "/home/user"));
		}

		if (!path.startsWith("/")) {
			return Ok(`/home/user/${path}`);
		}

		return Ok(path);
	}

	getParentPath(path: string): Result<string> {
		if (path === "/") {
			return Err(new Error("Already at root"));
		}

		const segments = path.split("/").filter((s) => s);
		if (segments.length === 0) {
			return Ok("/");
		}

		segments.pop();
		return Ok("/" + segments.join("/"));
	}

	joinPath(...segments: string[]): string {
		return segments
			.filter((s) => s)
			.join("/")
			.replace(/\/+/g, "/");
	}

	private async simulateDelay(): Promise<void> {
		if (this.delay > 0) {
			await new Promise((resolve) => setTimeout(resolve, this.delay));
		}
	}
}
