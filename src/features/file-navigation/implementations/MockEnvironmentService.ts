/**
 * Mock implementation of EnvironmentService for testing
 */

import { Ok, type Result } from "../../../shared/types/common.js";
import type { EnvironmentService } from "../interfaces/EnvironmentService.js";

/**
 * Mock implementation with predictable values
 */
export class MockEnvironmentService implements EnvironmentService {
	private currentDirectory: string;
	private homeDirectory: string;
	private terminalSize: { width: number; height: number };
	private envVars: Record<string, string>;

	constructor(options?: {
		currentDirectory?: string;
		homeDirectory?: string;
		terminalSize?: { width: number; height: number };
		envVars?: Record<string, string>;
	}) {
		this.currentDirectory = options?.currentDirectory ?? "/home/user";
		this.homeDirectory = options?.homeDirectory ?? "/home/user";
		this.terminalSize = options?.terminalSize ?? { width: 80, height: 24 };
		this.envVars = options?.envVars ?? { NODE_ENV: "test" };
	}

	getCurrentDirectory(): Result<string> {
		return Ok(this.currentDirectory);
	}

	getHomeDirectory(): Result<string> {
		return Ok(this.homeDirectory);
	}

	getTerminalSize(): { width: number; height: number } {
		return { ...this.terminalSize };
	}

	isTestEnvironment(): boolean {
		return true;
	}

	getEnv(key: string): string | undefined {
		return this.envVars[key];
	}

	// Test helper methods
	setCurrentDirectory(path: string): void {
		this.currentDirectory = path;
	}

	setTerminalSize(width: number, height: number): void {
		this.terminalSize = { width, height };
	}
}
