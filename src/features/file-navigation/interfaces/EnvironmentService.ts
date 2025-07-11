/**
 * Environment Service Interface
 * Abstraction for environment-specific operations
 */

import type { Result } from "../../../shared/types/common.js";

/**
 * Environment service interface
 * Provides access to environment-specific information
 */
export interface EnvironmentService {
	/**
	 * Get current working directory
	 * @returns Result containing current directory path or error
	 */
	getCurrentDirectory(): Result<string>;

	/**
	 * Get home directory
	 * @returns Result containing home directory path or error
	 */
	getHomeDirectory(): Result<string>;

	/**
	 * Get terminal dimensions
	 * @returns Terminal width and height
	 */
	getTerminalSize(): { width: number; height: number };

	/**
	 * Check if running in test environment
	 * @returns true if in test environment
	 */
	isTestEnvironment(): boolean;

	/**
	 * Get environment variable
	 * @param key - Environment variable key
	 * @returns Environment variable value or undefined
	 */
	getEnv(key: string): string | undefined;
}
