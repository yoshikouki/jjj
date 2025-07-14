/**
 * Node.js implementation of EnvironmentService
 */

import { homedir } from "node:os";
import { Err, Ok, type Result } from "../../../shared/types/common.js";
import type { EnvironmentService } from "../interfaces/EnvironmentService.js";

/**
 * Production implementation using Node.js APIs
 */
export class NodeEnvironmentService implements EnvironmentService {
	getCurrentDirectory(): Result<string> {
		try {
			return Ok(process.cwd());
		} catch (error) {
			return Err(new Error(`Failed to get current directory: ${error}`));
		}
	}

	getHomeDirectory(): Result<string> {
		try {
			return Ok(homedir());
		} catch (error) {
			return Err(new Error(`Failed to get home directory: ${error}`));
		}
	}

	getTerminalSize(): { width: number; height: number } {
		return {
			width: process.stdout.columns || 80,
			height: process.stdout.rows || 24,
		};
	}

	isTestEnvironment(): boolean {
		return process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test";
	}

	getEnv(key: string): string | undefined {
		return process.env[key];
	}
}
