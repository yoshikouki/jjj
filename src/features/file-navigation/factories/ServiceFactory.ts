/**
 * Factory functions for creating service instances
 * Implements Factory Pattern for dependency injection
 */

import { MockEnvironmentService } from "../implementations/MockEnvironmentService.js";
import { MockFileSystemService } from "../implementations/MockFileSystemService.js";
import { NodeEnvironmentService } from "../implementations/NodeEnvironmentService.js";
import { NodeFileSystemService } from "../implementations/NodeFileSystemService.js";
import type { EnvironmentService } from "../interfaces/EnvironmentService.js";
import type { FileSystemService } from "../interfaces/FileSystemService.js";

/**
 * Service configuration options
 */
export interface ServiceOptions {
	useMocks?: boolean;
	mockDelay?: number;
	mockShouldFail?: boolean;
}

/**
 * Create FileSystemService instance
 */
export const createFileSystemService = (
	options?: ServiceOptions,
): FileSystemService => {
	const isTest =
		process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test";
	const useMocks = options?.useMocks ?? isTest;

	if (useMocks) {
		return new MockFileSystemService({
			delay: options?.mockDelay,
			shouldFail: options?.mockShouldFail,
		});
	}

	return new NodeFileSystemService();
};

/**
 * Create EnvironmentService instance
 */
export const createEnvironmentService = (
	options?: ServiceOptions,
): EnvironmentService => {
	const isTest =
		process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test";
	const useMocks = options?.useMocks ?? isTest;

	if (useMocks) {
		return new MockEnvironmentService();
	}

	return new NodeEnvironmentService();
};

/**
 * Dependency container interface
 */
export interface Dependencies {
	fileSystemService: FileSystemService;
	environmentService: EnvironmentService;
}

/**
 * Create all dependencies
 */
export const createDependencies = (options?: ServiceOptions): Dependencies => {
	return {
		fileSystemService: createFileSystemService(options),
		environmentService: createEnvironmentService(options),
	};
};

/**
 * Create test dependencies with mocks
 */
export const createTestDependencies = (
	overrides?: Partial<Dependencies>,
): Dependencies => {
	return {
		fileSystemService:
			overrides?.fileSystemService ?? new MockFileSystemService(),
		environmentService:
			overrides?.environmentService ?? new MockEnvironmentService(),
	};
};
