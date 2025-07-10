# 設計原則とアーキテクチャ前提

このドキュメントは、本プロジェクトにおける設計の前提と原則を記録し、チームの共通認識として維持するためのものです。

## 🎯 設計の基本前提

### 1. テスタビリティ優先設計

**前提**: テストの書きやすさは、良い設計の最も重要な指標である

- テストが書きづらい = 設計に問題がある
- `any` 型の使用は設計の問題のシグナル
- モックが複雑 = 依存関係が適切でない

### 2. 変更容易性の重視

**前提**: コードは必ず変更される

- 初期実装の速度より、将来の変更容易性を優先
- 抽象化により変更の影響範囲を局所化
- 依存性注入により実装の差し替えを容易に

### 3. 型は設計ツール

**前提**: 型システムは設計意図を表現する第一級のツール

- 型で不可能な状態を表現できないようにする
- 型の曖昧さは設計の曖昧さ
- コンパイル時エラー > 実行時エラー

## 🏗️ アーキテクチャ原則

### 1. 依存性の逆転原則（DIP）

```typescript
// ❌ 具体的な実装に依存
import { readdir } from 'fs/promises';

// ✅ 抽象化に依存
interface FileSystemService {
  readDirectory(path: string): Promise<Result<FileItem[]>>;
}
```

### 2. 単一責任原則（SRP）

```typescript
// ❌ 複数の責任
const loadAndSortFiles = async (path: string) => {
  const files = await readFiles(path);      // I/O
  const sorted = sortFiles(files);          // ビジネスロジック
  dispatch({ type: 'SET_FILES', sorted });  // 状態管理
};

// ✅ 責任の分離
const loadFiles = async (path: string) => await fs.readDirectory(path);
const sortFiles = (files: FileItem[], config: SortConfig) => [...files].sort(compareFn);
const updateFileState = (files: FileItem[]) => dispatch({ type: 'SET_FILES', files });
```

### 3. 開放/閉鎖原則（OCP）

- 新しい機能追加時に既存コードを変更しない
- インターフェースとファクトリーパターンで拡張性を確保

## 🧪 テスト設計原則

### 1. テストの独立性

- 各テストは他のテストに依存しない
- グローバル状態を避ける
- テスト間でのデータ共有を排除

### 2. Arrange-Act-Assert パターン

```typescript
test('should sort files by name', () => {
  // Arrange
  const files = createTestFiles();
  
  // Act
  const sorted = sortFiles(files, { sortBy: 'name' });
  
  // Assert
  expect(sorted[0].name).toBe('a.txt');
});
```

### 3. モックの最小化

- 必要最小限のモックのみ使用
- 実装に近いモックを作成（MockFileSystemService）
- モックが複雑 = 設計の見直しサイン

## 📐 コーディング規約

### 1. 純粋関数の優先

```typescript
// ✅ 純粋関数
export const filterFiles = (
  files: FileItem[], 
  options: FilterOptions
): FileItem[] => {
  return files.filter(file => matchesFilter(file, options));
};
```

### 2. 早期リターン

```typescript
// ✅ 早期リターン
if (!isValid(input)) {
  return { success: false, error: 'Invalid input' };
}

// メインロジック
```

### 3. 型の明示

```typescript
// ✅ 明示的な型定義
interface FileOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

## 🔄 リファクタリング指針

### いつリファクタリングすべきか

1. **テストが書きづらいとき**
   - モックが複雑
   - セットアップが大量
   - `any` 型を使わざるを得ない

2. **変更が困難なとき**
   - 小さな変更が広範囲に影響
   - 同じような修正を複数箇所で実施
   - 副作用の予測が困難

3. **理解が困難なとき**
   - 関数が長すぎる（> 30行）
   - ネストが深い（> 3レベル）
   - 名前から動作が予測できない

## 🚀 実装チェックリスト

新しい機能を実装する前に：

- [ ] インターフェースを定義したか？
- [ ] 純粋関数として実装できる部分を分離したか？
- [ ] テストを先に書けるか？
- [ ] 依存性注入が可能か？
- [ ] 型安全性は確保されているか？

## 📚 参考資料

- [SOLID原則](https://en.wikipedia.org/wiki/SOLID)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Dependency Injection](https://martinfowler.com/articles/injection.html)

---

*最終更新: 2025-01-10*  
*次回レビュー: 2025-02-10*