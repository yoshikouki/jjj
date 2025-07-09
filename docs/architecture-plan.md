# Package by Feature アーキテクチャ計画

## 現在の問題点
- 491行の巨大なApp.tsxが全機能を担当
- layer分けされていない（ui/logic/data層の混在）
- 機能毎の責任分離ができていない

## Package by Feature 設計

### 特定したフィーチャー
1. **file-navigation**: ファイル・ディレクトリのナビゲーション
2. **file-preview**: ファイル内容のプレビュー表示
3. **terminal-ui**: ターミナルサイズ管理とUI計算
4. **keyboard-input**: キーボード入力処理とコマンド実行
5. **app-state**: アプリケーション全体の状態管理

### 新しいディレクトリ構成
```
src/
├── features/
│   ├── file-navigation/
│   │   ├── components/
│   │   │   ├── FileList.tsx
│   │   │   └── FileItem.tsx
│   │   ├── hooks/
│   │   │   └── useFileNavigation.ts
│   │   ├── services/
│   │   │   └── fileSystem.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── fileSort.ts
│   │       └── fileFormat.ts
│   ├── file-preview/
│   │   ├── components/
│   │   │   └── PreviewPanel.tsx
│   │   ├── hooks/
│   │   │   └── useFilePreview.ts
│   │   ├── services/
│   │   │   └── previewLoader.ts
│   │   └── types/
│   │       └── index.ts
│   ├── terminal-ui/
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── ScrollIndicator.tsx
│   │   ├── hooks/
│   │   │   └── useTerminalSize.ts
│   │   └── utils/
│   │       └── layoutCalculations.ts
│   ├── keyboard-input/
│   │   ├── hooks/
│   │   │   └── useKeyboardInput.ts
│   │   ├── services/
│   │   │   └── commandProcessor.ts
│   │   └── types/
│   │       └── commands.ts
│   └── app-state/
│       ├── hooks/
│       │   └── useAppState.ts
│       ├── reducers/
│       │   ├── navigationReducer.ts
│       │   ├── previewReducer.ts
│       │   └── uiReducer.ts
│       ├── actions/
│       │   └── index.ts
│       └── types/
│           └── state.ts
├── shared/
│   ├── types/
│   │   └── common.ts
│   ├── utils/
│   │   └── functional.ts
│   └── constants/
│       └── index.ts
├── app.tsx (大幅に縮小)
└── cli.tsx
```

## 並列実行可能なタスク

### 高優先度（並列実行）
1. **file-navigation**: ファイルシステム操作と純粋関数
2. **file-preview**: 非同期プレビュー機能
3. **terminal-ui**: UI計算とレイアウト
4. **keyboard-input**: コマンド処理と関数合成
5. **app-state**: Reducerパターンでの状態管理

### 中優先度（後続実行）
6. **tests**: 各機能のテスト作成
7. **linting**: コード品質向上
8. **performance**: 最適化

## 実装戦略
- 各フィーチャーは独立してサブエージェントで実装
- 純粋関数を中心とした設計
- 非同期処理の完全実装
- 関数型プログラミングの徹底適用