/**
 * Domain models for file navigation feature
 * Immutable data structures following functional programming principles
 */

import type { DeepReadonly } from "../../../shared/types/common.js";

/**
 * File type enumeration
 */
export const FileType = {
	File: "file",
	Directory: "directory",
	SymbolicLink: "symlink",
	Unknown: "unknown",
} as const;

export type FileType = (typeof FileType)[keyof typeof FileType];

/**
 * Core file item model
 */
export interface FileItem {
	readonly name: string;
	readonly path: string;
	readonly type: FileType;
	readonly size: number;
	readonly modifiedAt: Date;
	readonly isHidden: boolean;
	readonly isReadable: boolean;
	readonly isWritable: boolean;
	readonly isExecutable: boolean;
	readonly extension?: string;
	readonly linkTarget?: string;
}

/**
 * File statistics for UI display
 */
export interface FileStats {
	readonly totalCount: number;
	readonly fileCount: number;
	readonly directoryCount: number;
	readonly totalSize: number;
	readonly hiddenCount: number;
}

/**
 * Sort configuration
 */
export const SortKey = {
	Name: "name",
	Size: "size",
	Modified: "modified",
	Type: "type",
} as const;

export type SortKey = (typeof SortKey)[keyof typeof SortKey];

export const SortOrder = {
	Ascending: "asc",
	Descending: "desc",
} as const;

export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

export interface SortConfig {
	readonly key: SortKey;
	readonly order: SortOrder;
}

/**
 * Filter options
 */
export interface FilterOptions {
	readonly showHidden: boolean;
	readonly showDirectoriesFirst: boolean;
	readonly extensions?: readonly string[];
	readonly searchQuery?: string;
}

/**
 * Navigation state
 */
export interface NavigationState {
	readonly currentPath: string;
	readonly files: readonly FileItem[];
	readonly selectedIndex: number;
	readonly sortConfig: SortConfig;
	readonly filterOptions: FilterOptions;
	readonly isLoading: boolean;
	readonly error?: string;
}

/**
 * Type-safe state for making invalid states unrepresentable
 */
export type FileNavigationState = DeepReadonly<NavigationState>;
