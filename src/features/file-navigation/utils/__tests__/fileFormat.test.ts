/**
 * Tests for file formatting functions
 * Following Test-First Development approach
 */

import { describe, expect, test } from "bun:test";
import type { FileItem } from "../../types/index.js";
import {
	calculateColumnWidths,
	formatDate,
	formatFileSize,
	formatPermissions,
	getFileIcon,
	getFileTypeDescription,
	truncateFilename,
} from "../fileFormat.js";

const createTestFile = (overrides: Partial<FileItem>): FileItem => ({
	name: "test.txt",
	path: "/test/test.txt",
	type: "file",
	size: 1000,
	modifiedAt: new Date("2024-01-01"),
	isHidden: false,
	isReadable: true,
	isWritable: true,
	isExecutable: false,
	extension: "txt",
	...overrides,
});

describe("formatFileSize", () => {
	test("should format bytes", () => {
		expect(formatFileSize(0)).toBe("0 B");
		expect(formatFileSize(100)).toBe("100 B");
		expect(formatFileSize(1023)).toBe("1023 B");
	});

	test("should format kilobytes", () => {
		expect(formatFileSize(1024)).toBe("1.0 KB");
		expect(formatFileSize(1536)).toBe("1.5 KB");
		expect(formatFileSize(10240)).toBe("10 KB");
	});

	test("should format megabytes", () => {
		expect(formatFileSize(1048576)).toBe("1.0 MB");
		expect(formatFileSize(1572864)).toBe("1.5 MB");
		expect(formatFileSize(10485760)).toBe("10 MB");
	});

	test("should format gigabytes", () => {
		expect(formatFileSize(1073741824)).toBe("1.0 GB");
		expect(formatFileSize(5368709120)).toBe("5.0 GB");
	});
});

describe("formatDate", () => {
	test("should format today's date as time", () => {
		// Test by checking that the function doesn't return days ago format
		const veryRecent = new Date(Date.now() - 1000 * 60 * 30); // 30 minutes ago

		const formatted = formatDate(veryRecent);

		// Should show time, not days ago
		expect(formatted).toMatch(/\d{1,2}:\d{2}/);
		expect(formatted).not.toContain("d ago");
	});

	test("should format recent dates as days ago", () => {
		const now = new Date();
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);

		expect(formatDate(yesterday)).toBe("1d ago");

		const threeDaysAgo = new Date(now);
		threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

		expect(formatDate(threeDaysAgo)).toBe("3d ago");
	});

	test("should format dates within year", () => {
		const date = new Date();
		date.setMonth(0, 15); // Jan 15

		const formatted = formatDate(date);

		expect(formatted).toMatch(/Jan \d+/);
	});

	test("should format old dates with year", () => {
		const oldDate = new Date("2020-06-15");

		const formatted = formatDate(oldDate);

		expect(formatted).toMatch(/2020/);
	});
});

describe("getFileIcon", () => {
	test("should return directory icon", () => {
		const dir = createTestFile({ type: "directory" });
		expect(getFileIcon(dir)).toBe("📁");
	});

	test("should return parent directory icon", () => {
		const parent = createTestFile({ type: "directory", name: ".." });
		expect(getFileIcon(parent)).toBe("↩");
	});

	test("should return symlink icon", () => {
		const link = createTestFile({ type: "symlink" });
		expect(getFileIcon(link)).toBe("🔗");
	});

	test("should return code file icons", () => {
		expect(getFileIcon(createTestFile({ extension: "js" }))).toBe("📜");
		expect(getFileIcon(createTestFile({ extension: "ts" }))).toBe("📜");
		expect(getFileIcon(createTestFile({ extension: "tsx" }))).toBe("📜");
	});

	test("should return config file icons", () => {
		expect(getFileIcon(createTestFile({ extension: "json" }))).toBe("📋");
		expect(getFileIcon(createTestFile({ extension: "yaml" }))).toBe("📋");
	});

	test("should return text file icons", () => {
		expect(getFileIcon(createTestFile({ extension: "md" }))).toBe("📝");
		expect(getFileIcon(createTestFile({ extension: "txt" }))).toBe("📝");
	});

	test("should return media file icons", () => {
		expect(getFileIcon(createTestFile({ extension: "jpg" }))).toBe("🖼️");
		expect(getFileIcon(createTestFile({ extension: "mp4" }))).toBe("🎬");
		expect(getFileIcon(createTestFile({ extension: "mp3" }))).toBe("🎵");
	});

	test("should return archive icon", () => {
		expect(getFileIcon(createTestFile({ extension: "zip" }))).toBe("📦");
	});

	test("should return default icon for unknown extensions", () => {
		expect(getFileIcon(createTestFile({ extension: "xyz" }))).toBe("📄");
	});
});

describe("formatPermissions", () => {
	test("should format all permissions", () => {
		const file = createTestFile({
			isReadable: true,
			isWritable: true,
			isExecutable: true,
		});

		expect(formatPermissions(file)).toBe("rwx");
	});

	test("should format read-only", () => {
		const file = createTestFile({
			isReadable: true,
			isWritable: false,
			isExecutable: false,
		});

		expect(formatPermissions(file)).toBe("r--");
	});

	test("should format no permissions", () => {
		const file = createTestFile({
			isReadable: false,
			isWritable: false,
			isExecutable: false,
		});

		expect(formatPermissions(file)).toBe("---");
	});
});

describe("truncateFilename", () => {
	test("should not truncate short names", () => {
		expect(truncateFilename("short.txt", 20)).toBe("short.txt");
	});

	test("should truncate long names", () => {
		const longName = "this-is-a-very-long-filename.txt";

		expect(truncateFilename(longName, 15)).toBe("this-is-a-….txt");
	});

	test("should truncate without preserving extension", () => {
		const longName = "this-is-a-very-long-filename.txt";

		expect(truncateFilename(longName, 15, false)).toBe("this-is-a-very…");
	});

	test("should handle files without extension", () => {
		const longName = "this-is-a-very-long-filename";

		expect(truncateFilename(longName, 15)).toBe("this-is-a-very…");
	});

	test("should handle very long extensions", () => {
		const longName = "file.verylongextension";

		expect(truncateFilename(longName, 10)).toBe("file.very…");
	});
});

describe("getFileTypeDescription", () => {
	test("should return correct descriptions", () => {
		expect(getFileTypeDescription("file")).toBe("File");
		expect(getFileTypeDescription("directory")).toBe("Directory");
		expect(getFileTypeDescription("symlink")).toBe("Symbolic Link");
		expect(getFileTypeDescription("unknown")).toBe("Unknown");
	});
});

describe("calculateColumnWidths", () => {
	test("should calculate fixed widths correctly", () => {
		const files = [createTestFile({})];

		const widths = calculateColumnWidths(files, 80);

		expect(widths.icon).toBe(3);
		expect(widths.size).toBe(8);
		expect(widths.date).toBe(12);
		expect(widths.permissions).toBe(5);
	});

	test("should calculate name width based on terminal width", () => {
		const files = [createTestFile({})];

		const widths80 = calculateColumnWidths(files, 80);
		const widths120 = calculateColumnWidths(files, 120);

		expect(widths120.name).toBeGreaterThan(widths80.name);
		expect(widths120.name - widths80.name).toBe(40);
	});

	test("should enforce minimum name width", () => {
		const files = [createTestFile({})];

		const widths = calculateColumnWidths(files, 40);

		expect(widths.name).toBe(20); // Minimum width
	});
});
