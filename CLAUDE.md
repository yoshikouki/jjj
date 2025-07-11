---

# CLI File Explorer "jjj" - モバイルネイティブ設計

## 開発環境

### Bun ランタイム（必須）

```bash
# 基本コマンド
bun install         # パッケージインストール
bun run dev         # 開発サーバー起動
bun test           # テスト実行
bun typecheck      # 型チェック
bun lint           # リント実行
```

### 推奨パッケージマネージャー

- ❌ npm, yarn, pnpm は使用しない
- ✅ Bun標準のパッケージマネージャーを使用
- Bun は .env を自動読み込み（dotenv 不要）

### Bun API の優先使用

```typescript
// ✅ Bunネイティブ API
import { file } from "bun";
const content = await Bun.file("path/to/file").text();

// ❌ Node.js API は避ける
import { readFile } from "node:fs/promises";
```

### テスト環境

```typescript
// bun:test を使用
import { test, expect } from "bun:test";
import { renderHook } from "@testing-library/react";

test("should load files from directory", async () => {
  const dependencies = createTestDependencies();
  const { result } = renderHook(() => 
    useFileNavigation({ dependencies })
  );
  
  expect(result.current.state.files).toHaveLength(4);
});
```

---

# プロジェクト設計原則

## アーキテクチャ

### Package by Feature 構成

コードは機能単位で分割し、layer単位ではなくfeature単位でモジュール化する：

```
src/
├── features/
│   ├── file-navigation/     # ファイルナビゲーション機能
│   ├── file-preview/        # ファイルプレビュー機能
│   ├── terminal-ui/         # ターミナルUI管理
│   ├── keyboard-input/      # キーボード入力処理
│   └── app-state/           # アプリケーション状態管理
└── shared/                  # 共通ユーティリティ
```

### 依存性注入（DI）パターン

テスタビリティを最優先し、全ての外部依存は注入可能にする：

```typescript
// ✅ 良い例：依存性注入
interface FileSystemService {
  readDirectory(path: string): Promise<Result<FileItem[]>>;
}

const useFileNavigation = (options: {
  dependencies?: {
    fileSystemService: FileSystemService;
  };
}) => {
  // 実装
};

// ❌ 悪い例：直接依存
import { readdir } from 'fs/promises';
```

## 設計の基本前提

### 1. テスタビリティ優先設計

- テストが書きづらい = 設計に問題がある
- `any` 型の使用は設計の問題のシグナル
- モックが複雑 = 依存関係が適切でない

### 2. 純粋関数の最大化

```typescript
// ✅ 純粋関数（テストしやすい）
export const sortFiles = (
  files: FileItem[], 
  sortBy: SortKey, 
  order: SortOrder
): FileItem[] => {
  return [...files].sort((a, b) => compareFiles(a, b, sortBy, order));
};

// ❌ 副作用を含む関数（テストしづらい）
const loadAndSortFiles = async (path: string) => {
  const files = await readFiles(path);      // I/O副作用
  const sorted = sortFiles(files);          // ビジネスロジック
  dispatch({ type: 'SET_FILES', sorted }); // 状態変更副作用
};
```

### 3. 型は設計ツール

- 型で不可能な状態を表現できないようにする
- 型の曖昧さは設計の曖昧さ
- コンパイル時エラー > 実行時エラー

```typescript
// ✅ 明示的な型定義
interface FileOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ❌ 曖昧な型
let result: any;
```

## 関数型プログラミング適用

### 不変データ構造

```typescript
// ✅ 不変更新
const newState = {
  ...state,
  files: sortedFiles,
  selectedIndex: 0
};

// ❌ 可変更新
state.files = sortedFiles;
state.selectedIndex = 0;
```

### 関数合成

```typescript
// ✅ 関数合成による処理パイプライン
const processKeyInput = pipe(
  parseKeyInput,
  validateInput,
  mapToCommand,
  executeCommand
);

// ❌ 巨大な条件分岐
if (key.upArrow) {
  // 50行のロジック
} else if (key.downArrow) {
  // 50行のロジック
}
```

## TypeScript 設定

### Strict モード必須

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "moduleResolution": "Node16"
  }
}
```

### any型の完全排除

- any型の使用は設計の問題を示すサイン
- unknown型を使用し、適切な型ガードで型を絞り込む
- テストで型安全性を確保

## テスト戦略

### Test-First 開発

1. インターフェースを定義
2. テストを書く
3. 実装する
4. リファクタリング

### テストの独立性

```typescript
// ✅ 独立したテスト
test('should sort files by name', () => {
  // Arrange
  const files = createTestFiles();
  
  // Act
  const sorted = sortFiles(files, 'name', 'asc');
  
  // Assert
  expect(sorted[0].name).toBe('a.txt');
});
```

### モックサービス活用

```typescript
// テスト用の依存性作成
const createTestDependencies = () => ({
  fileSystemService: new MockFileSystemService(),
  pathUtilsService: new MockPathUtilsService(),
  environmentService: new MockEnvironmentService(),
});
```

## パフォーマンス最適化

### 非同期処理の適切な活用

- UIブロッキングを避けるため、ファイルシステムアクセスは必ず非同期
- Promise-based APIと async/await を使用
- エラーハンドリングを適切に実装

### メモ化による最適化

```typescript
// React.memo、useMemo、useCallbackの適切な活用
const FileList = React.memo(({ files, selectedIndex }) => {
  const sortedFiles = useMemo(() => 
    sortFiles(files, sortConfig), 
    [files, sortConfig]
  );
  
  const handleSelect = useCallback((index: number) => {
    onFileSelect(index);
  }, [onFileSelect]);
  
  return /* JSX */;
});
```

### 仮想スクロール実装

大量ファイル（1000+）でも快適な操作を実現：

```typescript
// 高性能な仮想スクロール
const useVirtualScroll = (
  items: FileItem[],
  containerHeight: number,
  itemHeight: number
) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  // 効率的な可視範囲計算
};
```

## 実装チェックリスト

新しい機能を実装する前に：

- [ ] インターフェースを定義したか？
- [ ] 純粋関数として実装できる部分を分離したか？
- [ ] テストを先に書けるか？
- [ ] 依存性注入が可能か？
- [ ] 型安全性は確保されているか？
- [ ] any型を使用していないか？

## パラダイムシフト：品質・保守性優先

「実装速度優先」から「品質・保守性優先」への根本的な前提変更：

| 観点 | 旧前提（実装速度優先） | 新前提（品質・保守性優先） |
|------|----------------------|--------------------------|
| **型安全性** | `any`型で素早く実装 | TypeScript strict modeで最初から開発 |
| **設計アプローチ** | 実装してから型を合わせる | Interface drivenで実装前に設計 |
| **テスト戦略** | 後からテスト追加 | Test drivenでテスト容易性を最初に検証 |
| **変更戦略** | 大きな変更を一気に実行 | 段階的移行で小さなステップに分解 |

### 成果指標

- **TypeScriptエラー**: 204個 → 30個（85.3%削減）
- **メインファイル行数**: 491行 → 24行（95%削減）
- **テストカバレッジ**: 0% → 94.3%
- **パフォーマンス**: 3-5倍高速化

---

*最終更新: 2025-01-10*  
*プロジェクト: CLI File Explorer "jjj"*  
*アーキテクチャ: 関数型プログラミング × Package by Feature*
