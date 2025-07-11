/**
 * Tests for useFileNavigation hook
 * Using manual testing approach due to testing library issues
 */

import { describe, expect, test } from "bun:test";
import { createTestDependencies } from "../../factories/ServiceFactory.js";

describe("useFileNavigation dependencies", () => {
	test("should create test dependencies successfully", () => {
		const dependencies = createTestDependencies();

		expect(dependencies.fileSystemService).toBeDefined();
		expect(dependencies.environmentService).toBeDefined();
	});

	test("should read mock directory", async () => {
		const dependencies = createTestDependencies();

		const result =
			await dependencies.fileSystemService.readDirectory("/home/user");

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.length).toBeGreaterThan(0);
			expect(result.value[0]!.name).toBe("..");
		}
	});

	test("should get environment info", () => {
		const dependencies = createTestDependencies();

		const cwdResult = dependencies.environmentService.getCurrentDirectory();
		const terminalSize = dependencies.environmentService.getTerminalSize();

		expect(cwdResult.ok).toBe(true);
		expect(terminalSize.width).toBeGreaterThan(0);
		expect(terminalSize.height).toBeGreaterThan(0);
	});
});
