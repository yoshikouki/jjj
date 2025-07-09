/**
 * 高度な検索エンジン
 *
 * ファイル検索、フィルタリング、ソート機能の最適化
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FileItem } from "../types/index.js";
import { useAdvancedDebounce, useOptimizedMemo } from "./performanceUtils.js";
import { ParallelProcessor } from "./workerPool.js";

/**
 * 検索設定
 */
export interface SearchConfig {
	/** 検索クエリ */
	query: string;
	/** 大文字小文字を区別するか */
	caseSensitive: boolean;
	/** 正規表現モード */
	regexMode: boolean;
	/** 完全一致 */
	exactMatch: boolean;
	/** 隠しファイルを表示するか */
	showHidden: boolean;
	/** ファイルタイプフィルター */
	fileTypes: string[];
	/** サイズフィルター */
	sizeFilter: {
		min?: number;
		max?: number;
	};
	/** 日付フィルター */
	dateFilter: {
		after?: Date;
		before?: Date;
	};
}

/**
 * 検索結果
 */
export interface SearchResult {
	/** 検索結果のファイル */
	files: FileItem[];
	/** マッチした総数 */
	totalMatches: number;
	/** 処理時間 */
	processingTime: number;
	/** 検索統計 */
	stats: {
		totalFiles: number;
		matchedFiles: number;
		filteredFiles: number;
	};
}

/**
 * 検索エンジンクラス
 */
export class SearchEngine {
	private parallelProcessor: ParallelProcessor;
	private searchCache: Map<string, SearchResult>;
	private maxCacheSize: number = 100;

	constructor() {
		this.parallelProcessor = new ParallelProcessor();
		this.searchCache = new Map();
	}

	/**
	 * ファイルを検索
	 */
	async search(files: FileItem[], config: SearchConfig): Promise<SearchResult> {
		const startTime = performance.now();

		// キャッシュキーを生成
		const cacheKey = this.generateCacheKey(files, config);
		const cached = this.searchCache.get(cacheKey);

		if (cached) {
			return cached;
		}

		let result = files;
		let totalMatches = 0;

		// 隠しファイルフィルター
		if (!config.showHidden) {
			result = this.filterHiddenFiles(result);
		}

		// テキスト検索
		if (config.query.trim()) {
			result = await this.searchByText(result, config);
		}

		// ファイルタイプフィルター
		if (config.fileTypes.length > 0) {
			result = this.filterByFileType(result, config.fileTypes);
		}

		// サイズフィルター
		if (
			config.sizeFilter.min !== undefined ||
			config.sizeFilter.max !== undefined
		) {
			result = this.filterBySize(result, config.sizeFilter);
		}

		// 日付フィルター
		if (config.dateFilter.after || config.dateFilter.before) {
			result = this.filterByDate(result, config.dateFilter);
		}

		totalMatches = result.length;
		const processingTime = performance.now() - startTime;

		const searchResult: SearchResult = {
			files: result,
			totalMatches,
			processingTime,
			stats: {
				totalFiles: files.length,
				matchedFiles: result.length,
				filteredFiles: files.length - result.length,
			},
		};

		// キャッシュに保存
		this.cacheResult(cacheKey, searchResult);

		return searchResult;
	}

	/**
	 * 隠しファイルをフィルター
	 */
	private filterHiddenFiles(files: FileItem[]): FileItem[] {
		return files.filter(
			(file) => !file.name.startsWith(".") || file.name === "..",
		);
	}

	/**
	 * テキストで検索
	 */
	private async searchByText(
		files: FileItem[],
		config: SearchConfig,
	): Promise<FileItem[]> {
		if (files.length < 100) {
			return this.searchByTextSync(files, config);
		}

		// 並列処理で検索
		return this.parallelProcessor.searchFiles(files, config.query, {
			caseSensitive: config.caseSensitive,
			regexMode: config.regexMode,
			exactMatch: config.exactMatch,
		});
	}

	/**
	 * 同期的なテキスト検索
	 */
	private searchByTextSync(
		files: FileItem[],
		config: SearchConfig,
	): FileItem[] {
		const query = config.caseSensitive
			? config.query
			: config.query.toLowerCase();

		return files.filter((file) => {
			const fileName = config.caseSensitive
				? file.name
				: file.name.toLowerCase();

			if (config.exactMatch) {
				return fileName === query;
			}

			if (config.regexMode) {
				try {
					const regex = new RegExp(
						config.query,
						config.caseSensitive ? "g" : "gi",
					);
					return regex.test(file.name);
				} catch {
					return false;
				}
			}

			return fileName.includes(query);
		});
	}

	/**
	 * ファイルタイプでフィルター
	 */
	private filterByFileType(files: FileItem[], fileTypes: string[]): FileItem[] {
		return files.filter((file) => {
			if (file.isDirectory) {
				return fileTypes.includes("directory");
			}

			const extension = file.name.split(".").pop()?.toLowerCase() || "";
			return fileTypes.includes(extension);
		});
	}

	/**
	 * サイズでフィルター
	 */
	private filterBySize(
		files: FileItem[],
		sizeFilter: SearchConfig["sizeFilter"],
	): FileItem[] {
		return files.filter((file) => {
			if (file.isDirectory) return true;

			if (sizeFilter.min !== undefined && file.size < sizeFilter.min) {
				return false;
			}

			if (sizeFilter.max !== undefined && file.size > sizeFilter.max) {
				return false;
			}

			return true;
		});
	}

	/**
	 * 日付でフィルター
	 */
	private filterByDate(
		files: FileItem[],
		dateFilter: SearchConfig["dateFilter"],
	): FileItem[] {
		return files.filter((file) => {
			if (dateFilter.after && file.modified < dateFilter.after) {
				return false;
			}

			if (dateFilter.before && file.modified > dateFilter.before) {
				return false;
			}

			return true;
		});
	}

	/**
	 * キャッシュキーを生成
	 */
	private generateCacheKey(files: FileItem[], config: SearchConfig): string {
		const filesHash = files
			.map((f) => `${f.name}:${f.size}:${f.modified.getTime()}`)
			.join("|");
		const configHash = JSON.stringify(config);
		return `${filesHash}:${configHash}`;
	}

	/**
	 * 検索結果をキャッシュ
	 */
	private cacheResult(key: string, result: SearchResult): void {
		if (this.searchCache.size >= this.maxCacheSize) {
			const firstKey = this.searchCache.keys().next().value;
			this.searchCache.delete(firstKey);
		}

		this.searchCache.set(key, result);
	}

	/**
	 * キャッシュをクリア
	 */
	clearCache(): void {
		this.searchCache.clear();
	}
}

/**
 * 検索フックの実装
 */
export const useFileSearch = (files: FileItem[]) => {
	const [searchConfig, setSearchConfig] = useState<SearchConfig>({
		query: "",
		caseSensitive: false,
		regexMode: false,
		exactMatch: false,
		showHidden: false,
		fileTypes: [],
		sizeFilter: {},
		dateFilter: {},
	});

	const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
	const [isSearching, setIsSearching] = useState(false);
	const searchEngineRef = useRef<SearchEngine>(new SearchEngine());

	// デバウンス処理
	const debouncedSearch = useAdvancedDebounce(
		async (files: FileItem[], config: SearchConfig) => {
			setIsSearching(true);
			try {
				const result = await searchEngineRef.current.search(files, config);
				setSearchResult(result);
			} catch (error) {
				console.error("Search error:", error);
			} finally {
				setIsSearching(false);
			}
		},
		300,
		{ leading: false, trailing: true, maxWait: 1000 },
	);

	// 検索実行
	useEffect(() => {
		if (files.length > 0) {
			debouncedSearch(files, searchConfig);
		}
	}, [files, searchConfig, debouncedSearch]);

	// 検索設定の更新関数
	const updateSearchConfig = useCallback((updates: Partial<SearchConfig>) => {
		setSearchConfig((prev) => ({ ...prev, ...updates }));
	}, []);

	// 検索クエリの更新
	const setQuery = useCallback(
		(query: string) => {
			updateSearchConfig({ query });
		},
		[updateSearchConfig],
	);

	// フィルターの更新
	const setFileTypes = useCallback(
		(fileTypes: string[]) => {
			updateSearchConfig({ fileTypes });
		},
		[updateSearchConfig],
	);

	const setSizeFilter = useCallback(
		(sizeFilter: SearchConfig["sizeFilter"]) => {
			updateSearchConfig({ sizeFilter });
		},
		[updateSearchConfig],
	);

	const setDateFilter = useCallback(
		(dateFilter: SearchConfig["dateFilter"]) => {
			updateSearchConfig({ dateFilter });
		},
		[updateSearchConfig],
	);

	// 検索結果のファイル
	const resultFiles = useMemo(() => {
		return searchResult?.files || [];
	}, [searchResult]);

	return {
		searchConfig,
		searchResult,
		isSearching,
		resultFiles,
		setQuery,
		setFileTypes,
		setSizeFilter,
		setDateFilter,
		updateSearchConfig,
	};
};

/**
 * 高度なフィルタリング機能
 */
export const useAdvancedFilter = (files: FileItem[]) => {
	const [filters, setFilters] = useState({
		name: "",
		showHidden: false,
		fileTypes: [] as string[],
		sizeRange: { min: 0, max: Infinity },
		dateRange: { after: null as Date | null, before: null as Date | null },
	});

	// フィルタリング結果を計算
	const filteredFiles = useOptimizedMemo(() => {
		let result = files;

		// 名前フィルター
		if (filters.name.trim()) {
			const nameFilter = filters.name.toLowerCase();
			result = result.filter((file) =>
				file.name.toLowerCase().includes(nameFilter),
			);
		}

		// 隠しファイルフィルター
		if (!filters.showHidden) {
			result = result.filter(
				(file) => !file.name.startsWith(".") || file.name === "..",
			);
		}

		// ファイルタイプフィルター
		if (filters.fileTypes.length > 0) {
			result = result.filter((file) => {
				if (file.isDirectory) {
					return filters.fileTypes.includes("directory");
				}
				const extension = file.name.split(".").pop()?.toLowerCase() || "";
				return filters.fileTypes.includes(extension);
			});
		}

		// サイズフィルター
		if (filters.sizeRange.min > 0 || filters.sizeRange.max < Infinity) {
			result = result.filter((file) => {
				if (file.isDirectory) return true;
				return (
					file.size >= filters.sizeRange.min &&
					file.size <= filters.sizeRange.max
				);
			});
		}

		// 日付フィルター
		if (filters.dateRange.after || filters.dateRange.before) {
			result = result.filter((file) => {
				if (
					filters.dateRange.after &&
					file.modified < filters.dateRange.after
				) {
					return false;
				}
				if (
					filters.dateRange.before &&
					file.modified > filters.dateRange.before
				) {
					return false;
				}
				return true;
			});
		}

		return result;
	}, [files, filters]);

	// フィルター更新関数
	const updateFilter = useCallback((key: string, value: any) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	}, []);

	const resetFilters = useCallback(() => {
		setFilters({
			name: "",
			showHidden: false,
			fileTypes: [],
			sizeRange: { min: 0, max: Infinity },
			dateRange: { after: null, before: null },
		});
	}, []);

	return {
		filters,
		filteredFiles,
		updateFilter,
		resetFilters,
	};
};

/**
 * インクリメンタル検索
 */
export const useIncrementalSearch = (files: FileItem[]) => {
	const [query, setQuery] = useState("");
	const [searchIndex, setSearchIndex] = useState(0);
	const [matches, setMatches] = useState<number[]>([]);

	// デバウンス処理
	const debouncedQuery = useAdvancedDebounce(query, 200);

	// マッチするファイルのインデックスを計算
	const matchedIndices = useOptimizedMemo(() => {
		if (!debouncedQuery.trim()) return [];

		const queryLower = debouncedQuery.toLowerCase();
		return files
			.map((file, index) => ({ file, index }))
			.filter(({ file }) => file.name.toLowerCase().includes(queryLower))
			.map(({ index }) => index);
	}, [files, debouncedQuery]);

	// マッチが更新されたときの処理
	useEffect(() => {
		setMatches(matchedIndices);
		setSearchIndex(0);
	}, [matchedIndices]);

	// 次のマッチに移動
	const nextMatch = useCallback(() => {
		if (matches.length > 0) {
			setSearchIndex((prev) => (prev + 1) % matches.length);
		}
	}, [matches.length]);

	// 前のマッチに移動
	const prevMatch = useCallback(() => {
		if (matches.length > 0) {
			setSearchIndex((prev) => (prev - 1 + matches.length) % matches.length);
		}
	}, [matches.length]);

	// 現在のマッチインデックス
	const currentMatchIndex = matches[searchIndex] || -1;

	return {
		query,
		setQuery,
		matches,
		currentMatchIndex,
		nextMatch,
		prevMatch,
		matchCount: matches.length,
	};
};

/**
 * ファジー検索
 */
export const useFuzzySearch = (files: FileItem[]) => {
	const [query, setQuery] = useState("");
	const debouncedQuery = useAdvancedDebounce(query, 300);

	// ファジー検索のスコア計算
	const calculateFuzzyScore = useCallback(
		(text: string, query: string): number => {
			if (!query) return 0;

			const textLower = text.toLowerCase();
			const queryLower = query.toLowerCase();

			let score = 0;
			let textIndex = 0;
			let queryIndex = 0;

			while (textIndex < text.length && queryIndex < query.length) {
				if (textLower[textIndex] === queryLower[queryIndex]) {
					score += 1;
					queryIndex++;
				}
				textIndex++;
			}

			// 完全一致ボーナス
			if (textLower.includes(queryLower)) {
				score += query.length;
			}

			// 先頭一致ボーナス
			if (textLower.startsWith(queryLower)) {
				score += query.length * 2;
			}

			return score;
		},
		[],
	);

	// ファジー検索結果
	const fuzzyResults = useOptimizedMemo(() => {
		if (!debouncedQuery.trim()) return files;

		return files
			.map((file) => ({
				file,
				score: calculateFuzzyScore(file.name, debouncedQuery),
			}))
			.filter(({ score }) => score > 0)
			.sort((a, b) => b.score - a.score)
			.map(({ file }) => file);
	}, [files, debouncedQuery, calculateFuzzyScore]);

	return {
		query,
		setQuery,
		results: fuzzyResults,
	};
};
