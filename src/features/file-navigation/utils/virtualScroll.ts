/**
 * 高度な仮想スクロール機能
 *
 * 動的サイズ対応、スムーズスクロール、メモリ効率の最適化
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { FileItem } from "../types/index.js";

/**
 * 仮想スクロール設定
 */
export interface VirtualScrollConfig {
	/** アイテムの基本高さ */
	itemHeight: number;
	/** バッファサイズ（画面外にレンダリングするアイテム数） */
	bufferSize: number;
	/** コンテナの高さ */
	containerHeight: number;
	/** オーバースキャン量（追加でレンダリングするアイテム数） */
	overscan: number;
	/** 動的サイズ対応 */
	dynamicSize: boolean;
	/** スムーズスクロール */
	smoothScroll: boolean;
}

/**
 * 仮想スクロール状態
 */
export interface VirtualScrollState {
	/** 表示開始インデックス */
	startIndex: number;
	/** 表示終了インデックス */
	endIndex: number;
	/** 上部スペーサーの高さ */
	topSpacerHeight: number;
	/** 下部スペーサーの高さ */
	bottomSpacerHeight: number;
	/** 総アイテム数 */
	totalItems: number;
	/** 可視アイテム数 */
	visibleItems: number;
	/** スクロール位置 */
	scrollOffset: number;
	/** アイテムサイズキャッシュ */
	itemSizeCache: Map<number, number>;
}

/**
 * 仮想スクロール用のカスタムフック
 */
export const useVirtualScroll = (
	items: FileItem[],
	config: VirtualScrollConfig,
): VirtualScrollState => {
	const [scrollOffset, _setScrollOffset] = useState(0);
	const [itemSizeCache, _setItemSizeCache] = useState<Map<number, number>>(
		new Map(),
	);
	const _rafRef = useRef<number | null>(null);

	// アイテムのサイズを取得
	const getItemSize = useCallback(
		(index: number): number => {
			if (config.dynamicSize && itemSizeCache.has(index)) {
				return itemSizeCache.get(index)!;
			}
			return config.itemHeight;
		},
		[config.dynamicSize, config.itemHeight, itemSizeCache],
	);

	// アイテムのオフセットを計算
	const getItemOffset = useCallback(
		(index: number): number => {
			if (!config.dynamicSize) {
				return index * config.itemHeight;
			}

			let offset = 0;
			for (let i = 0; i < index; i++) {
				offset += getItemSize(i);
			}
			return offset;
		},
		[config.dynamicSize, config.itemHeight, getItemSize],
	);

	// 表示範囲を計算
	const calculateVisibleRange = useCallback(() => {
		if (items.length === 0) {
			return { startIndex: 0, endIndex: 0 };
		}

		let startIndex = 0;
		let endIndex = 0;
		let accumulatedHeight = 0;

		// 開始インデックスを見つける
		for (let i = 0; i < items.length; i++) {
			const itemHeight = getItemSize(i);
			if (accumulatedHeight + itemHeight > scrollOffset) {
				startIndex = i;
				break;
			}
			accumulatedHeight += itemHeight;
		}

		// 終了インデックスを見つける
		accumulatedHeight = getItemOffset(startIndex);
		for (let i = startIndex; i < items.length; i++) {
			if (accumulatedHeight > scrollOffset + config.containerHeight) {
				endIndex = i;
				break;
			}
			accumulatedHeight += getItemSize(i);
			endIndex = i;
		}

		// オーバースキャンとバッファを適用
		const bufferedStart = Math.max(0, startIndex - config.overscan);
		const bufferedEnd = Math.min(items.length - 1, endIndex + config.overscan);

		return { startIndex: bufferedStart, endIndex: bufferedEnd };
	}, [
		items.length,
		scrollOffset,
		config.containerHeight,
		config.overscan,
		getItemSize,
		getItemOffset,
	]);

	// 仮想スクロール状態を計算
	const virtualScrollState: VirtualScrollState = {
		...calculateVisibleRange(),
		totalItems: items.length,
		visibleItems: Math.ceil(config.containerHeight / config.itemHeight),
		scrollOffset,
		itemSizeCache,
		topSpacerHeight: 0,
		bottomSpacerHeight: 0,
	};

	// スペーサーの高さを計算
	if (items.length > 0) {
		virtualScrollState.topSpacerHeight = getItemOffset(
			virtualScrollState.startIndex,
		);
		virtualScrollState.bottomSpacerHeight =
			getItemOffset(items.length) -
			getItemOffset(virtualScrollState.endIndex + 1);
	}

	return virtualScrollState;
};

/**
 * 動的サイズ対応の仮想スクロール
 */
export const useDynamicVirtualScroll = (
	_items: FileItem[],
	config: VirtualScrollConfig,
) => {
	const [itemSizes, setItemSizes] = useState<Map<number, number>>(new Map());
	const [measuredIndices, setMeasuredIndices] = useState<Set<number>>(
		new Set(),
	);
	const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

	// アイテムのサイズを測定
	const measureItemSize = useCallback((index: number, element: HTMLElement) => {
		const rect = element.getBoundingClientRect();
		const size = rect.height;

		setItemSizes((prev) => {
			const newSizes = new Map(prev);
			newSizes.set(index, size);
			return newSizes;
		});

		setMeasuredIndices((prev) => {
			const newIndices = new Set(prev);
			newIndices.add(index);
			return newIndices;
		});

		itemRefs.current.set(index, element);
	}, []);

	// アイテムサイズの取得
	const getItemSize = useCallback(
		(index: number): number => {
			return itemSizes.get(index) || config.itemHeight;
		},
		[itemSizes, config.itemHeight],
	);

	// ResizeObserverを使用したサイズ監視
	useEffect(() => {
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const element = entry.target as HTMLElement;
				const index = Array.from(itemRefs.current.entries()).find(
					([, el]) => el === element,
				)?.[0];

				if (index !== undefined) {
					const size = entry.contentRect.height;
					setItemSizes((prev) => {
						const newSizes = new Map(prev);
						newSizes.set(index, size);
						return newSizes;
					});
				}
			}
		});

		// 既存の要素を監視
		itemRefs.current.forEach((element) => {
			observer.observe(element);
		});

		return () => observer.disconnect();
	}, []);

	return {
		measureItemSize,
		getItemSize,
		measuredIndices,
	};
};

/**
 * スムーズスクロール機能
 */
export const useSmoothScroll = (
	targetOffset: number,
	duration: number = 300,
) => {
	const [currentOffset, setCurrentOffset] = useState(0);
	const animationRef = useRef<number | null>(null);

	useEffect(() => {
		const startOffset = currentOffset;
		const startTime = performance.now();

		const animate = (currentTime: number) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);

			// イージング関数（ease-out）
			const easeOut = 1 - (1 - progress) ** 3;

			const newOffset = startOffset + (targetOffset - startOffset) * easeOut;
			setCurrentOffset(newOffset);

			if (progress < 1) {
				animationRef.current = requestAnimationFrame(animate);
			}
		};

		if (animationRef.current) {
			cancelAnimationFrame(animationRef.current);
		}

		animationRef.current = requestAnimationFrame(animate);

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
		};
	}, [targetOffset, duration, currentOffset]);

	return currentOffset;
};

/**
 * パフォーマンス最適化された仮想スクロール
 */
export const useOptimizedVirtualScroll = (
	items: FileItem[],
	config: VirtualScrollConfig,
) => {
	const [state, setState] = useState<VirtualScrollState>({
		startIndex: 0,
		endIndex: 0,
		topSpacerHeight: 0,
		bottomSpacerHeight: 0,
		totalItems: items.length,
		visibleItems: Math.ceil(config.containerHeight / config.itemHeight),
		scrollOffset: 0,
		itemSizeCache: new Map(),
	});

	const rafRef = useRef<number | null>(null);
	const lastScrollTimeRef = useRef<number>(0);

	// スクロール処理の最適化
	const handleScroll = useCallback(
		(offset: number) => {
			const now = performance.now();

			// スクロール頻度を制限
			if (now - lastScrollTimeRef.current < 16) {
				// 60fps
				return;
			}

			lastScrollTimeRef.current = now;

			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
			}

			rafRef.current = requestAnimationFrame(() => {
				const visibleItems = Math.ceil(
					config.containerHeight / config.itemHeight,
				);
				const startIndex = Math.floor(offset / config.itemHeight);
				const endIndex = Math.min(
					startIndex + visibleItems + config.overscan,
					items.length - 1,
				);

				setState((prev) => ({
					...prev,
					startIndex: Math.max(0, startIndex - config.overscan),
					endIndex,
					scrollOffset: offset,
					topSpacerHeight: startIndex * config.itemHeight,
					bottomSpacerHeight: (items.length - endIndex - 1) * config.itemHeight,
				}));
			});
		},
		[items.length, config.containerHeight, config.itemHeight, config.overscan],
	);

	// アイテムサイズの更新
	const updateItemSize = useCallback((index: number, size: number) => {
		setState((prev) => {
			const newCache = new Map(prev.itemSizeCache);
			newCache.set(index, size);
			return { ...prev, itemSizeCache: newCache };
		});
	}, []);

	// クリーンアップ
	useEffect(() => {
		return () => {
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, []);

	return {
		state,
		handleScroll,
		updateItemSize,
	};
};

/**
 * 仮想スクロール用のIntersection Observer
 */
export const useIntersectionObserver = (
	callback: (entries: IntersectionObserverEntry[]) => void,
	options: IntersectionObserverInit = {},
) => {
	const observerRef = useRef<IntersectionObserver | null>(null);
	const elementsRef = useRef<Map<Element, () => void>>(new Map());

	useEffect(() => {
		observerRef.current = new IntersectionObserver(callback, {
			threshold: 0.1,
			rootMargin: "50px",
			...options,
		});

		const observer = observerRef.current;

		return () => {
			observer.disconnect();
		};
	}, [callback, options]);

	const observe = useCallback((element: Element, cleanupFn?: () => void) => {
		if (observerRef.current) {
			observerRef.current.observe(element);
			if (cleanupFn) {
				elementsRef.current.set(element, cleanupFn);
			}
		}
	}, []);

	const unobserve = useCallback((element: Element) => {
		if (observerRef.current) {
			observerRef.current.unobserve(element);
			const cleanupFn = elementsRef.current.get(element);
			if (cleanupFn) {
				cleanupFn();
				elementsRef.current.delete(element);
			}
		}
	}, []);

	return { observe, unobserve };
};

/**
 * 可視性に基づく遅延読み込み
 */
export const useLazyLoading = <T>(
	items: T[],
	loadMore: () => Promise<T[]>,
	hasMore: boolean,
) => {
	const [loading, setLoading] = useState(false);
	const [loadedItems, setLoadedItems] = useState<T[]>(items);
	const sentinelRef = useRef<HTMLDivElement | null>(null);

	const handleIntersection = useCallback(
		async (entries: IntersectionObserverEntry[]) => {
			const target = entries[0];
			if (target.isIntersecting && hasMore && !loading) {
				setLoading(true);
				try {
					const newItems = await loadMore();
					setLoadedItems((prev) => [...prev, ...newItems]);
				} catch (error) {
					console.error("Failed to load more items:", error);
				} finally {
					setLoading(false);
				}
			}
		},
		[hasMore, loading, loadMore],
	);

	const { observe, unobserve } = useIntersectionObserver(handleIntersection);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (sentinel) {
			observe(sentinel);
			return () => unobserve(sentinel);
		}
	}, [observe, unobserve]);

	return {
		loadedItems,
		loading,
		sentinelRef,
	};
};

/**
 * 仮想スクロール用のメモリ最適化
 */
export class VirtualScrollMemoryOptimizer {
	private cache = new Map<string, unknown>();
	private maxCacheSize = 1000;
	private accessOrder = new Map<string, number>();

	get(key: string): unknown {
		const value = this.cache.get(key);
		if (value !== undefined) {
			this.accessOrder.set(key, Date.now());
		}
		return value;
	}

	set(key: string, value: any): void {
		if (this.cache.size >= this.maxCacheSize) {
			this.evictLeastRecentlyUsed();
		}

		this.cache.set(key, value);
		this.accessOrder.set(key, Date.now());
	}

	private evictLeastRecentlyUsed(): void {
		let oldestKey = "";
		let oldestTime = Date.now();

		for (const [key, time] of this.accessOrder) {
			if (time < oldestTime) {
				oldestTime = time;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
			this.accessOrder.delete(oldestKey);
		}
	}

	clear(): void {
		this.cache.clear();
		this.accessOrder.clear();
	}

	getStats(): { size: number; maxSize: number } {
		return {
			size: this.cache.size,
			maxSize: this.maxCacheSize,
		};
	}
}
