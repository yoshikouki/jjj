/**
 * パフォーマンス最適化ユーティリティ
 *
 * メモ化、デバウンス、最適化関数の集約
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DisplayConfig, FileItem } from "../types/index.js";

/**
 * 深い比較関数 - React.memoの比較関数として使用
 */
export const deepEqual = (a: any, b: any): boolean => {
	if (a === b) return true;

	if (a === null || b === null) return false;
	if (typeof a !== typeof b) return false;

	if (typeof a === "object") {
		const keysA = Object.keys(a);
		const keysB = Object.keys(b);

		if (keysA.length !== keysB.length) return false;

		for (const key of keysA) {
			if (!keysB.includes(key)) return false;
			if (!deepEqual(a[key], b[key])) return false;
		}
		return true;
	}

	return false;
};

/**
 * FileItem配列の浅い比較関数
 */
export const areFilesEqual = (a: FileItem[], b: FileItem[]): boolean => {
	if (a.length !== b.length) return false;

	for (let i = 0; i < a.length; i++) {
		const fileA = a[i];
		const fileB = b[i];

		if (
			fileA.name !== fileB.name ||
			fileA.isDirectory !== fileB.isDirectory ||
			fileA.size !== fileB.size ||
			fileA.modified.getTime() !== fileB.modified.getTime()
		) {
			return false;
		}
	}

	return true;
};

/**
 * 配列の浅い比較関数（数値配列用）
 */
export const areArraysEqual = (a: number[], b: number[]): boolean => {
	if (a.length !== b.length) return false;

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}

	return true;
};

/**
 * 最適化されたuseMemo - 依存関係の比較を改善
 */
export const useOptimizedMemo = <T>(
	factory: () => T,
	deps: React.DependencyList,
	compareFn?: (a: React.DependencyList, b: React.DependencyList) => boolean,
): T => {
	const previousDeps = useRef<React.DependencyList | undefined>();
	const memoizedValue = useRef<T>();

	const depsEqual = compareFn
		? compareFn(deps, previousDeps.current || [])
		: JSON.stringify(deps) === JSON.stringify(previousDeps.current);

	if (!depsEqual || memoizedValue.current === undefined) {
		memoizedValue.current = factory();
		previousDeps.current = deps;
	}

	return memoizedValue.current;
};

/**
 * 最適化されたuseCallback - 依存関係の比較を改善
 */
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
	callback: T,
	deps: React.DependencyList,
	compareFn?: (a: React.DependencyList, b: React.DependencyList) => boolean,
): T => {
	const previousDeps = useRef<React.DependencyList | undefined>();
	const memoizedCallback = useRef<T>();

	const depsEqual = compareFn
		? compareFn(deps, previousDeps.current || [])
		: JSON.stringify(deps) === JSON.stringify(previousDeps.current);

	if (!depsEqual || memoizedCallback.current === undefined) {
		memoizedCallback.current = callback;
		previousDeps.current = deps;
	}

	return memoizedCallback.current;
};

/**
 * デバウンス処理のカスタムフック
 */
export const useDebounce = <T>(value: T, delay: number): T => {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
};

/**
 * 仮想スクロール用の最適化されたuseMemo
 */
export const useVirtualizedMemo = <T>(
	factory: () => T,
	_startIndex: number,
	_endIndex: number,
	_totalItems: number,
): T => {
	return useMemo(factory, []);
};

/**
 * ファイルリストの計算結果をキャッシュするフック
 */
export const useFileListCache = () => {
	const cache = useRef<Map<string, { data: FileItem[]; timestamp: number }>>(
		new Map(),
	);

	const getCachedFiles = useCallback(
		(path: string, ttl: number = 5000): FileItem[] | null => {
			const cached = cache.current.get(path);
			if (cached && Date.now() - cached.timestamp < ttl) {
				return cached.data;
			}
			return null;
		},
		[],
	);

	const setCachedFiles = useCallback((path: string, files: FileItem[]) => {
		cache.current.set(path, {
			data: files,
			timestamp: Date.now(),
		});
	}, []);

	const clearCache = useCallback(() => {
		cache.current.clear();
	}, []);

	return {
		getCachedFiles,
		setCachedFiles,
		clearCache,
	};
};

/**
 * 計算結果をメモ化するフック
 */
export const useComputedValue = <T>(
	computeFn: () => T,
	deps: React.DependencyList,
): T => {
	const previousDeps = useRef<React.DependencyList>();
	const computedValue = useRef<T>();

	const depsChanged = useMemo(() => {
		if (!previousDeps.current) return true;
		return !areArraysEqual(deps as number[], previousDeps.current as number[]);
	}, [deps]);

	if (depsChanged) {
		computedValue.current = computeFn();
		previousDeps.current = deps;
	}

	return computedValue.current!;
};

/**
 * レンダリング時間を測定するフック
 */
export const useRenderTime = (
	componentName: string,
	enabled: boolean = false,
) => {
	const startTime = useRef<number>(0);

	useEffect(() => {
		if (enabled) {
			startTime.current = performance.now();
		}
	});

	useEffect(() => {
		if (enabled) {
			const endTime = performance.now();
			const renderTime = endTime - startTime.current;
			console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
		}
	});
};

/**
 * メモリ使用量を監視するフック
 */
export const useMemoryMonitor = (
	intervalMs: number = 1000,
	enabled: boolean = false,
) => {
	const [memoryUsage, setMemoryUsage] = useState<number>(0);

	useEffect(() => {
		if (!enabled) return;

		const interval = setInterval(() => {
			if (performance.memory) {
				setMemoryUsage(performance.memory.usedJSHeapSize);
			}
		}, intervalMs);

		return () => clearInterval(interval);
	}, [intervalMs, enabled]);

	return memoryUsage;
};

/**
 * 最適化されたファイル比較関数
 */
export const areFileItemsEqual = (
	prevFile: FileItem,
	nextFile: FileItem,
): boolean => {
	return (
		prevFile.name === nextFile.name &&
		prevFile.isDirectory === nextFile.isDirectory &&
		prevFile.size === nextFile.size &&
		prevFile.modified.getTime() === nextFile.modified.getTime()
	);
};

/**
 * 表示設定の比較関数
 */
export const areDisplayConfigsEqual = (
	prevConfig: DisplayConfig,
	nextConfig: DisplayConfig,
): boolean => {
	return (
		prevConfig.showFileSize === nextConfig.showFileSize &&
		prevConfig.showModifiedDate === nextConfig.showModifiedDate &&
		prevConfig.terminalSize.width === nextConfig.terminalSize.width &&
		prevConfig.terminalSize.height === nextConfig.terminalSize.height
	);
};

/**
 * 高度なデバウンス処理のカスタムフック
 */
export const useAdvancedDebounce = <T extends (...args: any[]) => any>(
	callback: T,
	delay: number,
	options: {
		leading?: boolean;
		trailing?: boolean;
		maxWait?: number;
	} = {},
): T => {
	const { leading = false, trailing = true, maxWait } = options;

	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastCallTime = useRef<number>(0);

	const debouncedCallback = useCallback(
		(...args: Parameters<T>) => {
			const currentTime = Date.now();

			const shouldInvokeImmediately =
				leading && currentTime - lastCallTime.current > delay;

			if (shouldInvokeImmediately) {
				callback(...args);
				lastCallTime.current = currentTime;
			}

			// 既存のタイムアウトをクリア
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			// 最大待機時間のタイムアウトを設定
			if (maxWait && !maxTimeoutRef.current) {
				maxTimeoutRef.current = setTimeout(() => {
					callback(...args);
					lastCallTime.current = Date.now();
					maxTimeoutRef.current = null;
				}, maxWait);
			}

			// 通常のデバウンスタイムアウトを設定
			timeoutRef.current = setTimeout(() => {
				if (trailing) {
					callback(...args);
					lastCallTime.current = Date.now();
				}

				if (maxTimeoutRef.current) {
					clearTimeout(maxTimeoutRef.current);
					maxTimeoutRef.current = null;
				}
			}, delay);
		},
		[callback, delay, leading, trailing, maxWait],
	);

	return debouncedCallback as T;
};

/**
 * 非同期処理のキャンセル機能付きフック
 */
export const useCancellableAsync = <T>(
	asyncFn: () => Promise<T>,
	deps: React.DependencyList,
): { data: T | null; loading: boolean; error: Error | null } => {
	const [data, setData] = useState<T | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const cancelRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		let isCancelled = false;

		const execute = async () => {
			setLoading(true);
			setError(null);

			try {
				const result = await asyncFn();
				if (!isCancelled) {
					setData(result);
				}
			} catch (err) {
				if (!isCancelled) {
					setError(err instanceof Error ? err : new Error(String(err)));
				}
			} finally {
				if (!isCancelled) {
					setLoading(false);
				}
			}
		};

		cancelRef.current = () => {
			isCancelled = true;
		};

		execute();

		return () => {
			isCancelled = true;
		};
	}, deps);

	return { data, loading, error };
};
