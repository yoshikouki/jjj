/**
 * Tests for MockFileSystemService
 * Ensures mock behavior is predictable and testable
 */

import { describe, expect, test } from "bun:test";
import { MockFileSystemService } from "../MockFileSystemService.js";

describe("MockFileSystemService", () => {
	test("should read directory successfully", async () => {
		const service = new MockFileSystemService();

		const result = await service.readDirectory("/home/user");

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.length).toBe(6); // Including parent directory
			expect(result.value[0]!.name).toBe("..");
			expect(result.value.some((f) => f.name === "Documents")).toBe(true);
		}
	});

	test("should return error for non-existent directory", async () => {
		const service = new MockFileSystemService();

		const result = await service.readDirectory("/non/existent");

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.message).toContain("Directory not found");
		}
	});

	test("should simulate delay when configured", async () => {
		const service = new MockFileSystemService({ delay: 50 });

		const start = Date.now();
		await service.readDirectory("/home/user");
		const elapsed = Date.now() - start;

		expect(elapsed).toBeGreaterThanOrEqual(45); // Allow for some variance
	});

	test("should simulate failures when configured", async () => {
		const service = new MockFileSystemService({ shouldFail: true });

		const result = await service.readDirectory("/home/user");

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.message).toContain("Mock error");
		}
	});

	test("should get file stats", async () => {
		const service = new MockFileSystemService();

		const result = await service.getStats("/home/user/README.md");

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.name).toBe("README.md");
			expect(result.value.type).toBe("file");
			expect(result.value.size).toBe(1234);
		}
	});

	test("should check if path exists", async () => {
		const service = new MockFileSystemService();

		const existsResult = await service.exists("/home/user");
		const notExistsResult = await service.exists("/non/existent");

		expect(existsResult.ok && existsResult.value).toBe(true);
		expect(notExistsResult.ok && notExistsResult.value).toBe(false);
	});

	test("should check if path is directory", async () => {
		const service = new MockFileSystemService();

		const dirResult = await service.isDirectory("/home/user");
		const fileResult = await service.isDirectory("/home/user/README.md");

		expect(dirResult.ok && dirResult.value).toBe(true);
		expect(fileResult.ok && fileResult.value).toBe(false);
	});

	test("should read file preview", async () => {
		const service = new MockFileSystemService();

		const result = await service.readFilePreview("/home/user/README.md");

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toContain("Mock Project");
		}
	});

	test("should resolve paths", async () => {
		const service = new MockFileSystemService();

		const homeResult = await service.resolvePath("~/Documents");
		const relativeResult = await service.resolvePath("relative/path");
		const absoluteResult = await service.resolvePath("/absolute/path");

		expect(homeResult.ok && homeResult.value).toBe("/home/user/Documents");
		expect(relativeResult.ok && relativeResult.value).toBe(
			"/home/user/relative/path",
		);
		expect(absoluteResult.ok && absoluteResult.value).toBe("/absolute/path");
	});

	test("should get parent path", () => {
		const service = new MockFileSystemService();

		const result = service.getParentPath("/home/user/Documents");

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("/home/user");
		}
	});

	test("should handle root parent path", () => {
		const service = new MockFileSystemService();

		const result = service.getParentPath("/");

		expect(result.ok).toBe(false);
	});

	test("should join paths", () => {
		const service = new MockFileSystemService();

		const joined = service.joinPath("home", "user", "Documents");

		expect(joined).toBe("home/user/Documents");
	});
});
