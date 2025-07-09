/**
 * パフォーマンス監視システム
 * 
 * レンダリング時間、メモリ使用量、パフォーマンス指標の追跡
 */

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * パフォーマンス指標
 */
export interface PerformanceMetrics {
  /** レンダリング時間 */
  renderTime: number;
  /** メモリ使用量 */
  memoryUsage: number;
  /** FPS */
  fps: number;
  /** 仮想スクロール効率 */
  virtualScrollEfficiency: number;
  /** キャッシュヒット率 */
  cacheHitRate: number;
  /** ファイル読み込み時間 */
  fileLoadTime: number;
  /** レンダリング回数 */
  renderCount: number;
}

/**
 * パフォーマンス統計
 */
export interface PerformanceStats {
  /** 平均値 */
  average: PerformanceMetrics;
  /** 最小値 */
  min: PerformanceMetrics;
  /** 最大値 */
  max: PerformanceMetrics;
  /** 標準偏差 */
  stdDev: PerformanceMetrics;
  /** サンプル数 */
  sampleCount: number;
}

/**
 * パフォーマンス監視クラス
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxSamples: number = 100;
  private renderStartTime: number = 0;
  private frameCount: number = 0;
  private lastFpsTime: number = 0;
  private currentFps: number = 0;
  private memoryObserver: MemoryObserver | null = null;

  constructor(maxSamples: number = 100) {
    this.maxSamples = maxSamples;
    this.initializeMemoryObserver();
  }

  /**
   * メモリ監視を初期化
   */
  private initializeMemoryObserver(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      this.memoryObserver = new MemoryObserver();
    }
  }

  /**
   * レンダリング開始を記録
   */
  startRender(): void {
    this.renderStartTime = performance.now();
  }

  /**
   * レンダリング終了を記録
   */
  endRender(): void {
    if (this.renderStartTime > 0) {
      const renderTime = performance.now() - this.renderStartTime;
      this.recordMetric('renderTime', renderTime);
      this.renderStartTime = 0;
    }
  }

  /**
   * 指標を記録
   */
  recordMetric(name: keyof PerformanceMetrics, value: number): void {
    const currentMetrics = this.getCurrentMetrics();
    currentMetrics[name] = value;
    
    this.metrics.push(currentMetrics);
    
    if (this.metrics.length > this.maxSamples) {
      this.metrics.shift();
    }
  }

  /**
   * 現在の指標を取得
   */
  private getCurrentMetrics(): PerformanceMetrics {
    const memoryUsage = this.memoryObserver?.getCurrentUsage() || 0;
    
    return {
      renderTime: 0,
      memoryUsage,
      fps: this.currentFps,
      virtualScrollEfficiency: 0,
      cacheHitRate: 0,
      fileLoadTime: 0,
      renderCount: 0,
    };
  }

  /**
   * FPSを更新
   */
  updateFps(): void {
    const now = performance.now();
    this.frameCount++;
    
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  /**
   * 統計情報を計算
   */
  getStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      return this.getEmptyStats();
    }

    const sampleCount = this.metrics.length;
    const average = this.calculateAverage();
    const min = this.calculateMin();
    const max = this.calculateMax();
    const stdDev = this.calculateStandardDeviation(average);

    return {
      average,
      min,
      max,
      stdDev,
      sampleCount,
    };
  }

  /**
   * 平均値を計算
   */
  private calculateAverage(): PerformanceMetrics {
    const sum = this.metrics.reduce((acc, metrics) => ({
      renderTime: acc.renderTime + metrics.renderTime,
      memoryUsage: acc.memoryUsage + metrics.memoryUsage,
      fps: acc.fps + metrics.fps,
      virtualScrollEfficiency: acc.virtualScrollEfficiency + metrics.virtualScrollEfficiency,
      cacheHitRate: acc.cacheHitRate + metrics.cacheHitRate,
      fileLoadTime: acc.fileLoadTime + metrics.fileLoadTime,
      renderCount: acc.renderCount + metrics.renderCount,
    }), this.getEmptyMetrics());

    const count = this.metrics.length;
    return {
      renderTime: sum.renderTime / count,
      memoryUsage: sum.memoryUsage / count,
      fps: sum.fps / count,
      virtualScrollEfficiency: sum.virtualScrollEfficiency / count,
      cacheHitRate: sum.cacheHitRate / count,
      fileLoadTime: sum.fileLoadTime / count,
      renderCount: sum.renderCount / count,
    };
  }

  /**
   * 最小値を計算
   */
  private calculateMin(): PerformanceMetrics {
    return this.metrics.reduce((min, metrics) => ({
      renderTime: Math.min(min.renderTime, metrics.renderTime),
      memoryUsage: Math.min(min.memoryUsage, metrics.memoryUsage),
      fps: Math.min(min.fps, metrics.fps),
      virtualScrollEfficiency: Math.min(min.virtualScrollEfficiency, metrics.virtualScrollEfficiency),
      cacheHitRate: Math.min(min.cacheHitRate, metrics.cacheHitRate),
      fileLoadTime: Math.min(min.fileLoadTime, metrics.fileLoadTime),
      renderCount: Math.min(min.renderCount, metrics.renderCount),
    }), this.metrics[0]);
  }

  /**
   * 最大値を計算
   */
  private calculateMax(): PerformanceMetrics {
    return this.metrics.reduce((max, metrics) => ({
      renderTime: Math.max(max.renderTime, metrics.renderTime),
      memoryUsage: Math.max(max.memoryUsage, metrics.memoryUsage),
      fps: Math.max(max.fps, metrics.fps),
      virtualScrollEfficiency: Math.max(max.virtualScrollEfficiency, metrics.virtualScrollEfficiency),
      cacheHitRate: Math.max(max.cacheHitRate, metrics.cacheHitRate),
      fileLoadTime: Math.max(max.fileLoadTime, metrics.fileLoadTime),
      renderCount: Math.max(max.renderCount, metrics.renderCount),
    }), this.metrics[0]);
  }

  /**
   * 標準偏差を計算
   */
  private calculateStandardDeviation(average: PerformanceMetrics): PerformanceMetrics {
    const variance = this.metrics.reduce((acc, metrics) => ({
      renderTime: acc.renderTime + (metrics.renderTime - average.renderTime) ** 2,
      memoryUsage: acc.memoryUsage + (metrics.memoryUsage - average.memoryUsage) ** 2,
      fps: acc.fps + (metrics.fps - average.fps) ** 2,
      virtualScrollEfficiency: acc.virtualScrollEfficiency + (metrics.virtualScrollEfficiency - average.virtualScrollEfficiency) ** 2,
      cacheHitRate: acc.cacheHitRate + (metrics.cacheHitRate - average.cacheHitRate) ** 2,
      fileLoadTime: acc.fileLoadTime + (metrics.fileLoadTime - average.fileLoadTime) ** 2,
      renderCount: acc.renderCount + (metrics.renderCount - average.renderCount) ** 2,
    }), this.getEmptyMetrics());

    const count = this.metrics.length;
    return {
      renderTime: Math.sqrt(variance.renderTime / count),
      memoryUsage: Math.sqrt(variance.memoryUsage / count),
      fps: Math.sqrt(variance.fps / count),
      virtualScrollEfficiency: Math.sqrt(variance.virtualScrollEfficiency / count),
      cacheHitRate: Math.sqrt(variance.cacheHitRate / count),
      fileLoadTime: Math.sqrt(variance.fileLoadTime / count),
      renderCount: Math.sqrt(variance.renderCount / count),
    };
  }

  /**
   * 空の指標を取得
   */
  private getEmptyMetrics(): PerformanceMetrics {
    return {
      renderTime: 0,
      memoryUsage: 0,
      fps: 0,
      virtualScrollEfficiency: 0,
      cacheHitRate: 0,
      fileLoadTime: 0,
      renderCount: 0,
    };
  }

  /**
   * 空の統計を取得
   */
  private getEmptyStats(): PerformanceStats {
    const emptyMetrics = this.getEmptyMetrics();
    return {
      average: emptyMetrics,
      min: emptyMetrics,
      max: emptyMetrics,
      stdDev: emptyMetrics,
      sampleCount: 0,
    };
  }

  /**
   * 監視をリセット
   */
  reset(): void {
    this.metrics = [];
    this.frameCount = 0;
    this.lastFpsTime = 0;
    this.currentFps = 0;
  }
}

/**
 * メモリ監視クラス
 */
class MemoryObserver {
  private lastMemoryUsage: number = 0;
  private memoryHistory: number[] = [];
  private maxHistorySize: number = 60; // 1分間の履歴

  /**
   * 現在のメモリ使用量を取得
   */
  getCurrentUsage(): number {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      const memory = (window.performance as any).memory;
      this.lastMemoryUsage = memory.usedJSHeapSize;
      this.updateHistory(this.lastMemoryUsage);
      return this.lastMemoryUsage;
    }
    return 0;
  }

  /**
   * メモリ履歴を更新
   */
  private updateHistory(usage: number): void {
    this.memoryHistory.push(usage);
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }
  }

  /**
   * メモリ使用量の傾向を取得
   */
  getTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.memoryHistory.length < 2) return 'stable';

    const recent = this.memoryHistory.slice(-10);
    const average = recent.reduce((a, b) => a + b, 0) / recent.length;
    const current = recent[recent.length - 1];

    const difference = current - average;
    const threshold = average * 0.1; // 10%の変動を閾値とする

    if (difference > threshold) return 'increasing';
    if (difference < -threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * メモリリークの検出
   */
  detectMemoryLeak(): boolean {
    if (this.memoryHistory.length < this.maxHistorySize) return false;

    const first = this.memoryHistory[0];
    const last = this.memoryHistory[this.memoryHistory.length - 1];
    const increase = last - first;

    // 1分間で50%以上の増加をメモリリークとして検出
    return increase > first * 0.5;
  }
}

/**
 * パフォーマンス監視フック
 */
export const usePerformanceMonitor = (enabled: boolean = false) => {
  const [monitor] = useState(() => new PerformanceMonitor());
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // パフォーマンス統計の更新
  const updateStats = useCallback(() => {
    if (enabled) {
      const newStats = monitor.getStats();
      setStats(newStats);
      
      // FPSを更新
      monitor.updateFps();
      
      // 次のフレームで再実行
      animationFrameRef.current = requestAnimationFrame(updateStats);
    }
  }, [enabled, monitor]);

  // 監視開始/停止
  useEffect(() => {
    if (enabled) {
      updateStats();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, updateStats]);

  // 指標記録関数
  const recordMetric = useCallback((name: keyof PerformanceMetrics, value: number) => {
    if (enabled) {
      monitor.recordMetric(name, value);
    }
  }, [enabled, monitor]);

  // レンダリング時間測定
  const measureRender = useCallback(() => {
    if (!enabled) return { start: () => {}, end: () => {} };

    return {
      start: () => monitor.startRender(),
      end: () => monitor.endRender(),
    };
  }, [enabled, monitor]);

  // 監視リセット
  const reset = useCallback(() => {
    monitor.reset();
    setStats(null);
  }, [monitor]);

  return {
    stats,
    recordMetric,
    measureRender,
    reset,
  };
};

/**
 * コンポーネントレンダリング時間測定フック
 */
export const useRenderTimeMeasure = (componentName: string, enabled: boolean = false) => {
  const startTimeRef = useRef<number>(0);
  const { recordMetric } = usePerformanceMonitor(enabled);

  // レンダリング開始時
  useEffect(() => {
    if (enabled) {
      startTimeRef.current = performance.now();
    }
  });

  // レンダリング終了時
  useEffect(() => {
    if (enabled && startTimeRef.current > 0) {
      const endTime = performance.now();
      const renderTime = endTime - startTimeRef.current;
      recordMetric('renderTime', renderTime);
      
      if (renderTime > 16) { // 16ms以上の場合は警告
        console.warn(`${componentName} render time exceeded 16ms: ${renderTime.toFixed(2)}ms`);
      }
    }
  });
};

/**
 * リアルタイムパフォーマンス表示コンポーネント
 */
export const PerformanceDisplay = ({ enabled = false }: { enabled?: boolean }) => {
  const { stats } = usePerformanceMonitor(enabled);

  if (!enabled || !stats) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '4px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 9999,
    }}>
      <div>FPS: {stats.average.fps.toFixed(1)}</div>
      <div>Render: {stats.average.renderTime.toFixed(2)}ms</div>
      <div>Memory: {(stats.average.memoryUsage / 1024 / 1024).toFixed(2)}MB</div>
      <div>Cache {(stats.average.cacheHitRate * 100).toFixed(1)}%</div>
      <div>Samples: {stats.sampleCount}</div>
    </div>
  );
};

/**
 * パフォーマンス警告システム
 */
export class PerformanceWarningSystem {
  private thresholds = {
    renderTime: 16, // 16ms (60fps)
    memoryUsage: 100 * 1024 * 1024, // 100MB
    fps: 30,
    cacheHitRate: 0.5, // 50%
  };

  private warningCallbacks: Array<(warning: string) => void> = [];

  /**
   * 警告コールバックを追加
   */
  addWarningCallback(callback: (warning: string) => void): void {
    this.warningCallbacks.push(callback);
  }

  /**
   * 指標をチェック
   */
  checkMetrics(metrics: PerformanceMetrics): void {
    if (metrics.renderTime > this.thresholds.renderTime) {
      this.triggerWarning(`High render time: ${metrics.renderTime.toFixed(2)}ms`);
    }

    if (metrics.memoryUsage > this.thresholds.memoryUsage) {
      this.triggerWarning(`High memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }

    if (metrics.fps < this.thresholds.fps) {
      this.triggerWarning(`Low FPS: ${metrics.fps.toFixed(1)}`);
    }

    if (metrics.cacheHitRate < this.thresholds.cacheHitRate) {
      this.triggerWarning(`Low cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
    }
  }

  /**
   * 警告を発生
   */
  private triggerWarning(message: string): void {
    console.warn(`Performance Warning: ${message}`);
    this.warningCallbacks.forEach(callback => callback(message));
  }
}

/**
 * グローバルパフォーマンス監視インスタンス
 */
export const globalPerformanceMonitor = new PerformanceMonitor();
export const globalWarningSystem = new PerformanceWarningSystem();