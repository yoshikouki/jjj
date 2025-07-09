/**
 * ファイルリストコンポーネント
 * 
 * ファイルリストの表示とスクロール機能を担当
 * 仮想化によるパフォーマンス最適化を含む
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { FileItem, DisplayConfig, ScrollInfo } from '../types/index.js';
import { FileItemComponent } from './FileItem.js';
import { formatScrollIndicator } from '../utils/fileFormat.js';

/**
 * ファイルリストコンポーネントのプロパティ
 */
interface FileListProps {
  /** ファイルリスト */
  files: FileItem[];
  /** 選択されたファイルのインデックス */
  selectedIndex: number;
  /** 表示設定 */
  displayConfig: DisplayConfig;
  /** スクロール情報 */
  scrollInfo: ScrollInfo;
  /** エラー状態 */
  error?: string | null;
  /** 読み込み状態 */
  isLoading?: boolean;
  /** 空の状態メッセージ */
  emptyMessage?: string;
}

/**
 * ファイルリストコンポーネント
 */
export const FileList: React.FC<FileListProps> = React.memo(({
  files,
  selectedIndex,
  displayConfig,
  scrollInfo,
  error,
  isLoading,
  emptyMessage = 'No files found',
}) => {
  // 表示するファイルを計算
  const visibleFiles = React.useMemo(() => {
    return files.slice(scrollInfo.visibleStartIndex, scrollInfo.visibleEndIndex + 1);
  }, [files, scrollInfo.visibleStartIndex, scrollInfo.visibleEndIndex]);


  // 読み込み状態の表示
  if (isLoading) {
    return (
      <Box justifyContent="center" alignItems="center">
        <Text dimColor>Loading...</Text>
      </Box>
    );
  }

  // エラー状態の表示
  if (error) {
    return (
      <Box justifyContent="center" alignItems="center">
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  // 空の状態の表示
  if (files.length === 0) {
    return (
      <Box justifyContent="center" alignItems="center">
        <Text dimColor>{emptyMessage}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* ファイルリスト */}
      <Box flexDirection="column">
        {visibleFiles.map((file, visibleIndex) => {
          const actualIndex = scrollInfo.visibleStartIndex + visibleIndex;
          const isSelected = actualIndex === selectedIndex;
          
          return (
            <FileItemComponent
              key={`${file.name}-${actualIndex}`}
              file={file}
              isSelected={isSelected}
              displayConfig={displayConfig}
            />
          );
        })}
      </Box>
    </Box>
  );
});

FileList.displayName = 'FileList';

/**
 * 仮想化ファイルリストコンポーネント
 */
interface VirtualizedFileListProps extends FileListProps {
  /** ファイル選択時のハンドラー */
  onFileSelect?: (index: number) => void;
  /** ファイルアクティベート時のハンドラー */
  onFileActivate?: (file: FileItem, index: number) => void;
}

export const VirtualizedFileList: React.FC<VirtualizedFileListProps> = React.memo(({
  files,
  selectedIndex,
  displayConfig,
  scrollInfo,
  onFileSelect,
  onFileActivate,
  error,
  isLoading,
  emptyMessage,
}) => {
  return (
    <VirtualizedFileListCore
      files={files}
      selectedIndex={selectedIndex}
      displayConfig={displayConfig}
      scrollInfo={scrollInfo}
      onFileSelect={onFileSelect}
      onFileActivate={onFileActivate}
      error={error}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
    />
  );
});

VirtualizedFileList.displayName = 'VirtualizedFileList';

/**
 * 仮想化ファイルリストのコア実装
 */
const VirtualizedFileListCore: React.FC<VirtualizedFileListProps> = React.memo(({
  files,
  selectedIndex,
  displayConfig,
  scrollInfo,
  error,
  isLoading,
  emptyMessage,
}) => {
  // 仮想化のための設定
  const itemHeight = 1; // 各アイテムの高さ（行数）
  const containerHeight = scrollInfo.availableHeight;
  const startIndex = scrollInfo.visibleStartIndex;
  const endIndex = Math.min(startIndex + containerHeight, files.length);

  // 表示するファイルを計算
  const visibleFiles = files.slice(startIndex, endIndex);

  // 上部のスペーサー
  const topSpacerHeight = startIndex * itemHeight;
  
  // 下部のスペーサー
  const bottomSpacerHeight = (files.length - endIndex) * itemHeight;

  if (isLoading) {
    return (
      <Box justifyContent="center" alignItems="center">
        <Text dimColor>Loading...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box justifyContent="center" alignItems="center">
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (files.length === 0) {
    return (
      <Box justifyContent="center" alignItems="center">
        <Text dimColor>{emptyMessage}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* 上部スペーサー */}
      {topSpacerHeight > 0 && (
        <Box height={topSpacerHeight}>
          <Text> </Text>
        </Box>
      )}

      {/* 表示されるファイル */}
      {visibleFiles.map((file, visibleIndex) => {
        const actualIndex = startIndex + visibleIndex;
        const isSelected = actualIndex === selectedIndex;

        return (
          <FileItemComponent
            key={`${file.name}-${actualIndex}`}
            file={file}
            isSelected={isSelected}
            displayConfig={displayConfig}
          />
        );
      })}

      {/* 下部スペーサー */}
      {bottomSpacerHeight > 0 && (
        <Box height={bottomSpacerHeight}>
          <Text> </Text>
        </Box>
      )}
    </Box>
  );
});

VirtualizedFileListCore.displayName = 'VirtualizedFileListCore';

/**
 * ファイルリストの統計情報コンポーネント
 */
interface FileListStatsProps {
  /** ファイルリスト */
  files: FileItem[];
  /** 表示設定 */
  displayConfig: DisplayConfig;
}

export const FileListStats: React.FC<FileListStatsProps> = React.memo(({
  files,
}) => {
  const stats = React.useMemo(() => {
    const totalFiles = files.filter(f => !f.isDirectory).length;
    const totalDirectories = files.filter(f => f.isDirectory).length;
    const totalSize = files
      .filter(f => !f.isDirectory)
      .reduce((acc, f) => acc + f.size, 0);

    return { totalFiles, totalDirectories, totalSize };
  }, [files]);

  // 狭い画面では統計情報を省略
  if (process.stdout.columns && process.stdout.columns < 60) {
    return null;
  }

  return (
    <Box justifyContent="space-between">
      <Text dimColor>
        {stats.totalDirectories} dirs, {stats.totalFiles} files
      </Text>
      {stats.totalSize > 0 && (
        <Text dimColor>
          {formatBytes(stats.totalSize)}
        </Text>
      )}
    </Box>
  );
});

FileListStats.displayName = 'FileListStats';

/**
 * スクロールインジケーターコンポーネント
 */
interface ScrollIndicatorProps {
  /** スクロール情報 */
  scrollInfo: ScrollInfo;
  /** 表示設定 */
  displayConfig: DisplayConfig;
}

export const ScrollIndicator: React.FC<ScrollIndicatorProps> = React.memo(({
  scrollInfo,
}) => {
  const needsScrollIndicator = scrollInfo.totalItems > scrollInfo.availableHeight;

  if (!needsScrollIndicator) {
    return <Text> </Text>; // レイアウトを維持するための空のスペース
  }

  const indicator = formatScrollIndicator(
    scrollInfo.visibleStartIndex,
    scrollInfo.visibleEndIndex,
    scrollInfo.totalItems
  );

  return (
    <Box justifyContent="center">
      <Text dimColor>{indicator}</Text>
    </Box>
  );
});

ScrollIndicator.displayName = 'ScrollIndicator';

/**
 * ファイルリストのフィルター機能
 */
export const useFileListFilter = (files: FileItem[]) => {
  const [filter, setFilter] = React.useState('');
  const [showHidden, setShowHidden] = React.useState(false);

  const filteredFiles = React.useMemo(() => {
    let result = files;

    // 隠しファイルのフィルター
    if (!showHidden) {
      result = result.filter(file => !file.name.startsWith('.') || file.name === '..');
    }

    // 名前によるフィルター
    if (filter.trim()) {
      const filterLower = filter.toLowerCase();
      result = result.filter(file =>
        file.name.toLowerCase().includes(filterLower)
      );
    }

    return result;
  }, [files, filter, showHidden]);

  return {
    filteredFiles,
    filter,
    setFilter,
    showHidden,
    setShowHidden,
  };
};

/**
 * ファイルリストの選択状態管理
 */
export const useFileListSelection = (files: FileItem[]) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [multiSelection, setMultiSelection] = React.useState<number[]>([]);

  // 選択インデックスの正規化
  const normalizedIndex = React.useMemo(() => {
    return Math.max(0, Math.min(selectedIndex, files.length - 1));
  }, [selectedIndex, files.length]);

  const selectNext = React.useCallback(() => {
    setSelectedIndex(prev => Math.min(prev + 1, files.length - 1));
  }, [files.length]);

  const selectPrevious = React.useCallback(() => {
    setSelectedIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const selectItem = React.useCallback((index: number) => {
    if (index >= 0 && index < files.length) {
      setSelectedIndex(index);
    }
  }, [files.length]);

  const toggleMultiSelection = React.useCallback((index: number) => {
    setMultiSelection(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  }, []);

  const clearMultiSelection = React.useCallback(() => {
    setMultiSelection([]);
  }, []);

  return {
    selectedIndex: normalizedIndex,
    multiSelection,
    selectNext,
    selectPrevious,
    selectItem,
    toggleMultiSelection,
    clearMultiSelection,
  };
};

/**
 * バイト数を人間が読みやすい形式に変換する補助関数
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};