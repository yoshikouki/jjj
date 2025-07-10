# テスタブルな設計への学習記録

## 背景

リファクタリング過程で、テストコードで `any` 型や `unknown` 型を頻繁に使用せざるを得ない状況が発生。これは**テストしづらい設計**の症状であることが判明。

## 発見された問題点

### 1. グローバル状態への依存

**問題**: シングルトンパターンの乱用
```typescript
// 問題のあるコード
const globalCache = new AdvancedFileSystemCache();
let globalWorkerPool: WorkerPool | null = null;
```

**影響**:
- テスト間でのデータ共有によりテストの独立性が失われる
- 並列テスト実行時の競合状態発生
- テスト後のリソース清理が困難

**学習**: グローバル状態はテスタビリティの最大の敵

### 2. 密結合な依存関係

**問題**: 具体的な実装への直接依存
```typescript
// 問題のあるコード
import { readDirectoryWithCache } from "../services/fileSystem.js";
import { ParallelProcessor } from "../utils/workerPool.js";
```

**影響**:
- モジュールをテストするために多くの外部依存をモックする必要
- テスト設定が複雑になる
- 単体テストの範囲が曖昧

**学習**: 依存関係は抽象化（インターフェース）を通じて管理すべき

### 3. 副作用が多い関数

**問題**: 一つの関数で複数の責任を持つ
```typescript
// 問題のあるコード
const loadFiles = async (path: string) => {
  dispatch({ type: "SET_LOADING", payload: true });      // 副作用1
  dispatch({ type: "SET_ERROR", payload: null });        // 副作用2
  const result = await readDirectoryWithCache(path);     // 副作用3
  const sortedFiles = await parallelProcessor.sortFiles(...); // 副作用4
  dispatch({ type: "SET_FILES", payload: filesWithParent }); // 副作用5
};
```

**影響**:
- 個別の責任をテストできない
- テストが複雑になる
- 中間状態の検証が困難

**学習**: 副作用を分離し、純粋関数として抽出すべき

### 4. 型定義の曖昧さ

**問題**: `any` や `unknown` 型の乱用
```typescript
// 問題のあるコード
export const deepEqual = (a: any, b: any): boolean => { ... }
let result: unknown;
```

**影響**:
- 型安全性の喪失
- テストで型エラーを検出できない
- 実行時エラーのリスク増大

**学習**: 型は設計の意図を表現する重要な要素

## 改善方針

### 1. 依存性注入パターンの導入

```typescript
// 改善後のコード
interface FileSystemService {
  readDirectory(path: string): Promise<FileItem[]>;
  readFilePreview(path: string): Promise<string>;
}

class FileNavigationService {
  constructor(private fs: FileSystemService) {}
  
  async loadFiles(path: string): Promise<FileItem[]> {
    return this.fs.readDirectory(path);
  }
}
```

### 2. 純粋関数の分離

```typescript
// 改善後のコード
// 純粋関数（テストが簡単）
export const sortFiles = (files: FileItem[], sortBy: SortKey): FileItem[] => {
  return files.sort((a, b) => compareFiles(a, b, sortBy));
};

// 副作用を持つ関数（純粋関数を使用）
export const useSortedFiles = (files: FileItem[], sortBy: SortKey) => {
  return useMemo(() => sortFiles(files, sortBy), [files, sortBy]);
};
```

### 3. 抽象化レイヤーの追加

```typescript
// 改善後のコード
// 抽象化
interface FileSystem {
  readDirectory(path: string): Promise<FileItem[]>;
  readFile(path: string): Promise<string>;
}

// 実装
class NodeFileSystem implements FileSystem {
  async readDirectory(path: string): Promise<FileItem[]> {
    // Node.js fs を使用
  }
}

// テスト用実装
class MockFileSystem implements FileSystem {
  async readDirectory(path: string): Promise<FileItem[]> {
    // モックデータを返す
  }
}
```

### 4. ファクトリーパターンの活用

```typescript
// 改善後のコード
export const createFileSystem = (options?: FileSystemOptions): FileSystem => {
  return process.env.NODE_ENV === 'test' 
    ? new MockFileSystem(options)
    : new NodeFileSystem(options);
};
```

## 実践的な改善手順

1. **純粋関数の抽出**: ビジネスロジックを副作用から分離
2. **インターフェース定義**: 外部依存を抽象化
3. **依存性注入**: コンストラクタで依存性を受け取る
4. **ファクトリー関数**: 環境に応じた実装を提供
5. **グローバル状態の排除**: 必要に応じて状態を注入

## 期待される効果

- **テストの独立性**: 各テストが他のテストに影響しない
- **モックの簡単さ**: インターフェースを通じて簡単にモック可能
- **型安全性**: 明確な型定義により実行時エラーを防止
- **保守性**: 責任の分離により変更が容易
- **再利用性**: 依存性注入により異なる環境で再利用可能

## 実装した改善内容

### 1. ファイルシステムアクセスの抽象化 ✅

**作成したファイル**:
- `interfaces/FileSystemService.ts` - 抽象化インターフェース
- `implementations/NodeFileSystemService.ts` - 本番実装
- `implementations/MockFileSystemService.ts` - テスト用モック
- `factories/FileSystemFactory.ts` - ファクトリーパターン

**成果**:
- 実際のファイルシステムアクセスとテスト用モックを同じインターフェースで扱える
- 環境に応じて自動的に適切な実装を選択
- テスト時は実際のファイルシステムにアクセスしない

### 2. 純粋関数の抽出 ✅

**改良したファイル**:
- `utils/fileSort.ts` - ソート、フィルタリング、統計計算などの純粋関数

**改善点**:
- `sortFiles(files, sortBy, order)` - 副作用なしでファイルをソート
- `filterFilesByOptions(files, options)` - 複合条件でのフィルタリング
- `calculateFileListStats(files)` - ファイル統計の計算
- 型安全性の向上（exhaustive check の追加）

### 3. 依存性注入の導入 ✅

**改良したファイル**:
- `hooks/useFileNavigation.ts` - 依存性注入対応

**改善点**:
```typescript
// テスト時
const dependencies = {
  fileSystemService: mockFileSystemService,
  pathUtilsService: mockPathUtilsService,
  environmentService: mockEnvironmentService,
};

const navigation = useFileNavigation({ dependencies });
```

- `process.cwd()` への直接依存を排除
- グローバル状態への依存を最小化
- テスト時に完全に制御可能

### 4. テストの大幅改善 ✅

**作成したファイル**:
- `__tests__/useFileNavigation.test.ts` - 包括的なテスト

**改善点**:
- `any` 型や `unknown` 型を使用せずにテスト可能
- モックファイルシステムによる予測可能なテスト
- エラーケースやエッジケースの網羅的テスト
- 非同期処理の適切なテスト

### 5. 型定義の強化 ✅

**改良したファイル**:
- `types/index.ts` - 型定義の修正

**改善点**:
- `FileSortConfig.sortBy` の統一（`type` から `sortBy` へ）
- 型安全性の向上（exhaustive check）
- 明確なインターフェース定義

## 学習成果と効果

### Before（改善前）
```typescript
// テストが困難な例
test("some test", async (t) => {
  let receivedArgs: unknown[] = []; // any型を使わざるを得ない
  const testFn = (...args: unknown[]) => { // 型が不明確
    receivedArgs = args;
  };
  // 実際のファイルシステムに依存
  // グローバル状態の影響
  // 副作用が多数
});
```

### After（改善後）
```typescript
// テストしやすい例
test('should load files from directory', async () => {
  const dependencies = createTestDependencies(); // 明確な型
  
  const { result } = renderHook(() =>
    useFileNavigation({ dependencies }) // 依存性注入
  );

  // 予測可能なモックデータ
  expect(result.current.state.files).toHaveLength(4);
  expect(result.current.state.files[0].name).toBe('..');
});
```

### 測定可能な改善

1. **型安全性**: `any` / `unknown` 型の使用をほぼ排除
2. **テスト独立性**: 各テストが他のテストに影響しない
3. **テスト実行速度**: 実ファイルシステムアクセスなしで高速化
4. **保守性**: 明確な責任分離により変更が容易
5. **再利用性**: 異なる環境で同じコードを使用可能

## 重要な設計原則の学習

### 1. 依存性の逆転（Dependency Inversion）
```typescript
// Before: 具体的な実装に依存
import { readDirectoryWithCache } from "../services/fileSystem.js";

// After: 抽象化に依存
interface CachedFileSystemService {
  readDirectoryWithCache(path: string): Promise<DirectoryReadResult>;
}
```

### 2. 単一責任の原則（Single Responsibility）
```typescript
// Before: 一つの関数で複数の責任
const loadFiles = async (path: string) => {
  dispatch({ type: "SET_LOADING", payload: true });      // 状態更新
  const result = await readDirectory(path);               // ファイル読み込み
  const sortedFiles = await parallelProcessor.sortFiles(...); // ソート
  dispatch({ type: "SET_FILES", payload: files });      // 状態更新
};

// After: 責任の分離
const sortedFiles = sortFiles(files, sortBy, order);    // 純粋関数
const filesWithParent = addParentDirectory(files, path); // 純粋関数
dispatch({ type: "SET_FILES", payload: filesWithParent }); // 状態更新のみ
```

### 3. 開放/閉鎖の原則（Open/Closed）
- インターフェースにより、新しい実装を追加時に既存コードを変更不要
- ファクトリーパターンにより、環境ごとの実装選択が容易

## 次のステップ

1. ~~ファイルシステムアクセスの抽象化~~ ✅
2. ~~純粋関数の抽出~~ ✅
3. ~~依存性注入の導入~~ ✅
4. ~~テストの改善~~ ✅
5. ~~型定義の強化~~ ✅
6. コンポーネントの依存性注入対応 🔄
7. 残りのグローバル状態の除去
8. パフォーマンス最適化の検証

---

*記録日: 2025-01-10*
*学習者: Claude & User*
*更新: テスタブル設計の実装完了*