/**
 * ファイルシステムサービスファクトリー
 *
 * 環境に応じて適切なファイルシステムサービスの実装を提供
 * 依存性注入を実現するための中核となるファクトリー
 */

import {
	MockCachedFileSystemService,
	MockEnvironmentService,
	type MockFileSystemOptions,
	MockFileSystemService,
	MockPathUtilsService,
} from "../implementations/MockFileSystemService.js";

import {
	CachedNodeFileSystemService,
	NodeEnvironmentService,
	NodeFileSystemService,
	NodePathUtilsService,
} from "../implementations/NodeFileSystemService.js";
import type {
	CachedFileSystemService,
	EnvironmentService,
	FileSystemService,
	FileSystemServiceOptions,
	PathUtilsService,
} from "../interfaces/FileSystemService.js";

/**
 * ファイルシステムサービスの種類
 */
export type FileSystemServiceType =
	| "node" // 本番・開発環境用
	| "mock" // テスト環境用
	| "cached-node" // キャッシュ付き本番・開発環境用
	| "cached-mock"; // キャッシュ付きテスト環境用

/**
 * サービスファクトリーの設定
 */
export interface ServiceFactoryOptions {
	/**
	 * ファイルシステムサービスの種類
	 */
	fileSystemType?: FileSystemServiceType;

	/**
	 * ファイルシステムサービスの設定
	 */
	fileSystemOptions?: FileSystemServiceOptions;

	/**
	 * モックファイルシステムの設定（テスト時のみ）
	 */
	mockOptions?: MockFileSystemOptions;

	/**
	 * 自動的に環境を検出するか
	 */
	autoDetectEnvironment?: boolean;
}

/**
 * サービスコンテナ
 *
 * 依存性注入のためのサービスコンテナ
 * 全てのサービスインスタンスを管理
 */
export class ServiceContainer {
	private fileSystemService: FileSystemService | null = null;
	private cachedFileSystemService: CachedFileSystemService | null = null;
	private pathUtilsService: PathUtilsService | null = null;
	private environmentService: EnvironmentService | null = null;
	private options: ServiceFactoryOptions;

	constructor(options: ServiceFactoryOptions = {}) {
		this.options = {
			autoDetectEnvironment: true,
			...options,
		};
	}

	/**
	 * ファイルシステムサービスを取得
	 */
	getFileSystemService(): FileSystemService {
		if (!this.fileSystemService) {
			this.fileSystemService = this.createFileSystemService();
		}
		return this.fileSystemService;
	}

	/**
	 * キャッシュ付きファイルシステムサービスを取得
	 */
	getCachedFileSystemService(): CachedFileSystemService {
		if (!this.cachedFileSystemService) {
			this.cachedFileSystemService = this.createCachedFileSystemService();
		}
		return this.cachedFileSystemService;
	}

	/**
	 * パス操作ユーティリティサービスを取得
	 */
	getPathUtilsService(): PathUtilsService {
		if (!this.pathUtilsService) {
			this.pathUtilsService = this.createPathUtilsService();
		}
		return this.pathUtilsService;
	}

	/**
	 * 環境サービスを取得
	 */
	getEnvironmentService(): EnvironmentService {
		if (!this.environmentService) {
			this.environmentService = this.createEnvironmentService();
		}
		return this.environmentService;
	}

	/**
	 * 環境を自動検出
	 */
	private detectEnvironment(): FileSystemServiceType {
		if (this.options.fileSystemType) {
			return this.options.fileSystemType;
		}

		if (!this.options.autoDetectEnvironment) {
			return "node";
		}

		// 環境変数から判断
		const nodeEnv = process.env.NODE_ENV;
		const isTest =
			nodeEnv === "test" ||
			process.env.JEST_WORKER_ID !== undefined ||
			process.env.VITEST !== undefined ||
			process.env.AVA_PATH !== undefined;

		if (isTest) {
			return "cached-mock";
		}

		return "cached-node";
	}

	/**
	 * ファイルシステムサービスの実装を作成
	 */
	private createFileSystemService(): FileSystemService {
		const type = this.detectEnvironment();

		switch (type) {
			case "node":
				return new NodeFileSystemService(this.options.fileSystemOptions);

			case "mock":
				return new MockFileSystemService(this.options.mockOptions);

			case "cached-node":
				return new CachedNodeFileSystemService(this.options.fileSystemOptions);

			case "cached-mock":
				return new MockCachedFileSystemService(this.options.mockOptions);

			default:
				throw new Error(`Unknown file system service type: ${type}`);
		}
	}

	/**
	 * キャッシュ付きファイルシステムサービスの実装を作成
	 */
	private createCachedFileSystemService(): CachedFileSystemService {
		const type = this.detectEnvironment();

		switch (type) {
			case "node":
			case "cached-node":
				return new CachedNodeFileSystemService(this.options.fileSystemOptions);

			case "mock":
			case "cached-mock":
				return new MockCachedFileSystemService(this.options.mockOptions);

			default:
				throw new Error(`Unknown cached file system service type: ${type}`);
		}
	}

	/**
	 * パス操作ユーティリティサービスの実装を作成
	 */
	private createPathUtilsService(): PathUtilsService {
		const type = this.detectEnvironment();

		if (type.includes("mock")) {
			return new MockPathUtilsService();
		} else {
			return new NodePathUtilsService();
		}
	}

	/**
	 * 環境サービスの実装を作成
	 */
	private createEnvironmentService(): EnvironmentService {
		const type = this.detectEnvironment();

		if (type.includes("mock")) {
			return new MockEnvironmentService();
		} else {
			return new NodeEnvironmentService();
		}
	}

	/**
	 * サービスを強制的に再作成
	 */
	refresh(): void {
		this.fileSystemService = null;
		this.cachedFileSystemService = null;
		this.pathUtilsService = null;
		this.environmentService = null;
	}

	/**
	 * リソースを解放
	 */
	dispose(): void {
		// キャッシュ付きサービスのリソース解放
		if (
			this.cachedFileSystemService &&
			"destroy" in this.cachedFileSystemService
		) {
			(this.cachedFileSystemService as any).destroy();
		}

		this.refresh();
	}
}

/**
 * グローバルサービスコンテナ
 *
 * アプリケーション全体で使用するデフォルトのサービスコンテナ
 * テスト時は個別のコンテナを使用することを推奨
 */
let globalServiceContainer: ServiceContainer | null = null;

/**
 * グローバルサービスコンテナを取得
 */
export function getGlobalServiceContainer(): ServiceContainer {
	if (!globalServiceContainer) {
		globalServiceContainer = new ServiceContainer();
	}
	return globalServiceContainer;
}

/**
 * グローバルサービスコンテナを設定
 */
export function setGlobalServiceContainer(container: ServiceContainer): void {
	// 既存のコンテナがあれば解放
	if (globalServiceContainer) {
		globalServiceContainer.dispose();
	}
	globalServiceContainer = container;
}

/**
 * グローバルサービスコンテナをリセット
 */
export function resetGlobalServiceContainer(): void {
	if (globalServiceContainer) {
		globalServiceContainer.dispose();
		globalServiceContainer = null;
	}
}

/**
 * ファイルシステムサービスファクトリー関数
 */
export function createFileSystemService(
	options: ServiceFactoryOptions = {},
): FileSystemService {
	const container = new ServiceContainer(options);
	return container.getFileSystemService();
}

/**
 * キャッシュ付きファイルシステムサービスファクトリー関数
 */
export function createCachedFileSystemService(
	options: ServiceFactoryOptions = {},
): CachedFileSystemService {
	const container = new ServiceContainer(options);
	return container.getCachedFileSystemService();
}

/**
 * パス操作ユーティリティファクトリー関数
 */
export function createPathUtilsService(
	options: ServiceFactoryOptions = {},
): PathUtilsService {
	const container = new ServiceContainer(options);
	return container.getPathUtilsService();
}

/**
 * 環境サービスファクトリー関数
 */
export function createEnvironmentService(
	options: ServiceFactoryOptions = {},
): EnvironmentService {
	const container = new ServiceContainer(options);
	return container.getEnvironmentService();
}

/**
 * テスト用のサービスコンテナ作成
 */
export function createTestServiceContainer(
	mockOptions: MockFileSystemOptions = {},
): ServiceContainer {
	return new ServiceContainer({
		fileSystemType: "cached-mock",
		mockOptions,
		autoDetectEnvironment: false,
	});
}

/**
 * 本番用のサービスコンテナ作成
 */
export function createProductionServiceContainer(
	options: FileSystemServiceOptions = {},
): ServiceContainer {
	return new ServiceContainer({
		fileSystemType: "cached-node",
		fileSystemOptions: options,
		autoDetectEnvironment: false,
	});
}
