# ADR-001: テスタブルアーキテクチャへの移行

**日付**: 2025-01-10  
**ステータス**: 承認済み  
**決定者**: 開発チーム

## コンテキスト

プロジェクトの成長に伴い、以下の問題が顕在化：

1. **テストの困難性**
   - グローバル状態への依存によりテストが相互に影響
   - モックの作成が複雑で時間がかかる
   - `any` 型を多用せざるを得ない状況

2. **変更の困難性**
   - 密結合により小さな変更が広範囲に影響
   - 環境依存のコードが散在
   - リファクタリングのリスクが高い

3. **理解の困難性**
   - 副作用が多く、関数の動作が予測困難
   - 依存関係が不明確
   - 型情報が不十分

## 決定

以下のアーキテクチャ原則を採用する：

### 1. 依存性注入（DI）パターン

```typescript
// 実装例
interface Dependencies {
  fileSystemService: FileSystemService;
  cacheService: CacheService;
}

function createService(deps: Dependencies) {
  return {
    async loadFiles(path: string) {
      return deps.fileSystemService.readDirectory(path);
    }
  };
}
```

### 2. インターフェース分離

```typescript
// FileSystemService.ts
interface FileSystemService {
  readDirectory(path: string): Promise<Result<FileItem[]>>;
  readFilePreview(path: string): Promise<Result<string>>;
}

// 本番実装
class NodeFileSystemService implements FileSystemService { }

// テスト実装  
class MockFileSystemService implements FileSystemService { }
```

### 3. ファクトリーパターン

```typescript
export function createFileSystemService(options?: Options): FileSystemService {
  if (process.env.NODE_ENV === 'test') {
    return new MockFileSystemService(options);
  }
  return new NodeFileSystemService(options);
}
```

### 4. 純粋関数の分離

```typescript
// ビジネスロジックを純粋関数として分離
export const sortFiles = (files: FileItem[], config: SortConfig): FileItem[] => {
  return [...files].sort((a, b) => compareFiles(a, b, config));
};
```

## 結果

### 期待される効果

1. **テスタビリティの向上**
   - 各コンポーネントが独立してテスト可能
   - モックの作成が簡単
   - 型安全なテスト

2. **保守性の向上**
   - 変更の影響範囲が明確
   - 新機能追加が既存コードに影響しない
   - リファクタリングが安全

3. **開発効率の向上**
   - 並行開発が容易
   - デバッグが簡単
   - オンボーディングが早い

### トレードオフ

1. **初期実装の複雑性**
   - インターフェース定義の追加作業
   - ファクトリー関数の実装
   - より多くのファイル数

2. **学習コスト**
   - DIパターンの理解が必要
   - 設計原則の習得が必要

## 実装計画

### Phase 1: 基盤整備（完了）
- [x] インターフェース定義
- [x] ファクトリー実装
- [x] モックサービス作成

### Phase 2: 既存コードの移行（進行中）
- [x] useFileNavigation の DI 対応
- [x] ファイルソート機能の純粋関数化
- [ ] その他のコンポーネントの移行

### Phase 3: 最適化
- [ ] パフォーマンス測定
- [ ] 不要な抽象化の除去
- [ ] ドキュメント整備

## 参考資料

- [Dependency Injection in TypeScript](https://www.typescriptlang.org/docs/handbook/decorators.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Test Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

## 改訂履歴

- 2025-01-10: 初版作成