/**
 * Performance Test Setup for NativeMimic v4.0
 * 
 * Specialized setup for performance testing to prevent regressions
 * like those that caused the v3.16 UI failures
 */

import { beforeAll, beforeEach, afterEach, vi } from 'vitest';

// Performance testing configuration
const PERFORMANCE_CONFIG = {
  // Performance thresholds (in milliseconds)
  maxWidgetRenderTime: 100,
  maxTTSRequestTime: 2000,
  maxStorageAccessTime: 50,
  maxMemoryUsageMB: 50,
  maxDOMNodes: 1000,
  
  // Monitoring intervals
  memoryCheckInterval: 1000,
  performanceCheckInterval: 500,
  
  // Test data sizes
  smallTextLength: 50,
  mediumTextLength: 500,
  largeTextLength: 5000,
  
  // Browser simulation
  simulatedSlowCPU: 4, // 4x slower than normal
  simulatedSlowNetwork: 1000, // 1 second delay
  simulatedLowMemory: 256 * 1024 * 1024 // 256MB limit
};

// Performance metrics tracking
interface PerformanceMetrics {
  renderTimes: number[];
  memoryUsage: number[];
  domNodeCount: number[];
  networkRequests: number[];
  storageOperations: number[];
  cpuUsage: number[];
  errors: string[];
}

let performanceMetrics: PerformanceMetrics = {
  renderTimes: [],
  memoryUsage: [],
  domNodeCount: [],
  networkRequests: [],
  storageOperations: [],
  cpuUsage: [],
  errors: []
};

// Memory leak detection
let initialMemoryUsage = 0;
let memoryMonitoringInterval: NodeJS.Timeout | null = null;

// Performance observers
let performanceObserver: PerformanceObserver | null = null;
let mutationObserver: MutationObserver | null = null;

// Setup before all performance tests
beforeAll(async () => {
  console.log('⚡ Setting up performance testing environment...');
  
  // Record initial memory usage
  if (global.gc) {
    global.gc();
  }
  initialMemoryUsage = getMemoryUsage();
  
  // Setup performance monitoring
  setupPerformanceMonitoring();
  
  // Setup memory leak detection
  setupMemoryLeakDetection();
  
  // Setup DOM mutation monitoring
  setupDOMMutationMonitoring();
  
  // Setup network simulation
  setupNetworkSimulation();
  
  console.log('✅ Performance testing environment ready');
  console.log(`📊 Initial memory usage: ${initialMemoryUsage.toFixed(2)}MB`);
});

// Setup before each performance test
beforeEach(() => {
  // Reset performance metrics
  performanceMetrics = {
    renderTimes: [],
    memoryUsage: [],
    domNodeCount: [],
    networkRequests: [],
    storageOperations: [],
    cpuUsage: [],
    errors: []
  };
  
  // Record baseline metrics
  recordPerformanceBaseline();
  
  // Start continuous monitoring
  startContinuousMonitoring();
});

// Cleanup after each performance test
afterEach(() => {
  // Stop monitoring
  stopContinuousMonitoring();
  
  // Analyze performance results
  const analysis = analyzePerformanceResults();
  
  // Log performance summary
  logPerformanceSummary(analysis);
  
  // Check for performance regressions
  checkPerformanceRegressions(analysis);
  
  // Clean up DOM to prevent memory leaks
  cleanupDOMForPerformance();
});

/**
 * Setup performance monitoring using Performance Observer API
 */
function setupPerformanceMonitoring() {
  if (typeof PerformanceObserver !== 'undefined') {
    performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'measure') {
          performanceMetrics.renderTimes.push(entry.duration);
        }
        if (entry.entryType === 'navigation') {
          performanceMetrics.networkRequests.push(entry.duration);
        }
      });
    });
    
    performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
  }
}

/**
 * Setup memory leak detection
 */
function setupMemoryLeakDetection() {
  // Monitor memory usage periodically
  memoryMonitoringInterval = setInterval(() => {
    const currentMemory = getMemoryUsage();
    performanceMetrics.memoryUsage.push(currentMemory);
    
    // Check for memory leaks (memory increasing consistently)
    if (performanceMetrics.memoryUsage.length > 5) {
      const recentUsage = performanceMetrics.memoryUsage.slice(-5);
      const isIncreasing = recentUsage.every((usage, index) => 
        index === 0 || usage > recentUsage[index - 1]
      );
      
      if (isIncreasing) {
        const leak = currentMemory - initialMemoryUsage;
        if (leak > 10) { // 10MB threshold
          performanceMetrics.errors.push(`Potential memory leak detected: +${leak.toFixed(2)}MB`);
        }
      }
    }
  }, PERFORMANCE_CONFIG.memoryCheckInterval);
}

/**
 * Setup DOM mutation monitoring
 */
function setupDOMMutationMonitoring() {
  mutationObserver = new MutationObserver((mutations) => {
    let addedNodes = 0;
    let removedNodes = 0;
    
    mutations.forEach(mutation => {
      addedNodes += mutation.addedNodes.length;
      removedNodes += mutation.removedNodes.length;
    });
    
    // Record DOM node count
    const totalNodes = document.querySelectorAll('*').length;
    performanceMetrics.domNodeCount.push(totalNodes);
    
    // Check for DOM bloat
    if (totalNodes > PERFORMANCE_CONFIG.maxDOMNodes) {
      performanceMetrics.errors.push(`DOM bloat detected: ${totalNodes} nodes (max: ${PERFORMANCE_CONFIG.maxDOMNodes})`);
    }
    
    // Check for DOM thrashing (many additions without removals)
    if (addedNodes > 100 && removedNodes < addedNodes * 0.1) {
      performanceMetrics.errors.push(`DOM thrashing detected: ${addedNodes} added, ${removedNodes} removed`);
    }
  });
  
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    attributeOldValue: false,
    characterData: false,
    characterDataOldValue: false
  });
}

/**
 * Setup network simulation for performance testing
 */
function setupNetworkSimulation() {
  const originalFetch = global.fetch;
  
  global.fetch = vi.fn(async (...args) => {
    const startTime = performance.now();
    
    // Simulate slow network if configured
    if (PERFORMANCE_CONFIG.simulatedSlowNetwork > 0) {
      await new Promise(resolve => setTimeout(resolve, PERFORMANCE_CONFIG.simulatedSlowNetwork));
    }
    
    const response = await originalFetch.apply(global, args);
    
    const duration = performance.now() - startTime;
    performanceMetrics.networkRequests.push(duration);
    
    return response;
  });
  
  // Monitor storage operations
  const originalStorageGet = chrome.storage.sync.get;
  chrome.storage.sync.get = vi.fn(async (...args) => {
    const startTime = performance.now();
    const result = await originalStorageGet.apply(chrome.storage.sync, args);
    const duration = performance.now() - startTime;
    
    performanceMetrics.storageOperations.push(duration);
    
    if (duration > PERFORMANCE_CONFIG.maxStorageAccessTime) {
      performanceMetrics.errors.push(`Slow storage access: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  });
}

/**
 * Record performance baseline before test
 */
function recordPerformanceBaseline() {
  performance.mark('test-start');
  performanceMetrics.memoryUsage.push(getMemoryUsage());
  performanceMetrics.domNodeCount.push(document.querySelectorAll('*').length);
}

/**
 * Start continuous performance monitoring during test
 */
function startContinuousMonitoring() {
  const monitoringInterval = setInterval(() => {
    // Record current metrics
    performanceMetrics.memoryUsage.push(getMemoryUsage());
    performanceMetrics.domNodeCount.push(document.querySelectorAll('*').length);
    
    // Simulate CPU monitoring (in real browser, would use Performance API)
    const cpuUsage = simulateCPUUsage();
    performanceMetrics.cpuUsage.push(cpuUsage);
    
  }, PERFORMANCE_CONFIG.performanceCheckInterval);
  
  // Store interval ID for cleanup
  (global as any).__performanceMonitoringInterval = monitoringInterval;
}

/**
 * Stop continuous monitoring
 */
function stopContinuousMonitoring() {
  const monitoringInterval = (global as any).__performanceMonitoringInterval;
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    delete (global as any).__performanceMonitoringInterval;
  }
  
  performance.mark('test-end');
  performance.measure('test-duration', 'test-start', 'test-end');
}

/**
 * Analyze performance test results
 */
function analyzePerformanceResults() {
  const analysis = {
    memoryUsage: {
      min: Math.min(...performanceMetrics.memoryUsage),
      max: Math.max(...performanceMetrics.memoryUsage),
      avg: performanceMetrics.memoryUsage.reduce((a, b) => a + b, 0) / performanceMetrics.memoryUsage.length,
      leak: Math.max(...performanceMetrics.memoryUsage) - Math.min(...performanceMetrics.memoryUsage)
    },
    renderTimes: {
      min: Math.min(...performanceMetrics.renderTimes),
      max: Math.max(...performanceMetrics.renderTimes),
      avg: performanceMetrics.renderTimes.reduce((a, b) => a + b, 0) / performanceMetrics.renderTimes.length || 0,
      p95: percentile(performanceMetrics.renderTimes, 0.95)
    },
    domNodes: {
      min: Math.min(...performanceMetrics.domNodeCount),
      max: Math.max(...performanceMetrics.domNodeCount),
      avg: performanceMetrics.domNodeCount.reduce((a, b) => a + b, 0) / performanceMetrics.domNodeCount.length || 0
    },
    networkRequests: {
      min: Math.min(...performanceMetrics.networkRequests),
      max: Math.max(...performanceMetrics.networkRequests),
      avg: performanceMetrics.networkRequests.reduce((a, b) => a + b, 0) / performanceMetrics.networkRequests.length || 0,
      count: performanceMetrics.networkRequests.length
    },
    storageOperations: {
      min: Math.min(...performanceMetrics.storageOperations),
      max: Math.max(...performanceMetrics.storageOperations),
      avg: performanceMetrics.storageOperations.reduce((a, b) => a + b, 0) / performanceMetrics.storageOperations.length || 0,
      count: performanceMetrics.storageOperations.length
    },
    errors: performanceMetrics.errors
  };
  
  return analysis;
}

/**
 * Log performance summary
 */
function logPerformanceSummary(analysis: any) {
  console.log('\n📊 Performance Test Summary:');
  console.log(`Memory: ${analysis.memoryUsage.min.toFixed(2)}MB - ${analysis.memoryUsage.max.toFixed(2)}MB (leak: ${analysis.memoryUsage.leak.toFixed(2)}MB)`);
  console.log(`Render times: avg ${analysis.renderTimes.avg.toFixed(2)}ms, p95 ${analysis.renderTimes.p95.toFixed(2)}ms`);
  console.log(`DOM nodes: ${analysis.domNodes.min} - ${analysis.domNodes.max} (avg: ${analysis.domNodes.avg.toFixed(0)})`);
  console.log(`Network requests: ${analysis.networkRequests.count} (avg: ${analysis.networkRequests.avg.toFixed(2)}ms)`);
  console.log(`Storage operations: ${analysis.storageOperations.count} (avg: ${analysis.storageOperations.avg.toFixed(2)}ms)`);
  
  if (analysis.errors.length > 0) {
    console.log(`⚠️ Performance issues detected:`);
    analysis.errors.forEach(error => console.log(`  - ${error}`));
  }
}

/**
 * Check for performance regressions
 */
function checkPerformanceRegressions(analysis: any) {
  const regressions = [];
  
  // Check render time regression
  if (analysis.renderTimes.p95 > PERFORMANCE_CONFIG.maxWidgetRenderTime) {
    regressions.push(`Render time regression: ${analysis.renderTimes.p95.toFixed(2)}ms > ${PERFORMANCE_CONFIG.maxWidgetRenderTime}ms`);
  }
  
  // Check memory usage regression
  if (analysis.memoryUsage.max > PERFORMANCE_CONFIG.maxMemoryUsageMB) {
    regressions.push(`Memory usage regression: ${analysis.memoryUsage.max.toFixed(2)}MB > ${PERFORMANCE_CONFIG.maxMemoryUsageMB}MB`);
  }
  
  // Check memory leak
  if (analysis.memoryUsage.leak > 5) {
    regressions.push(`Memory leak detected: ${analysis.memoryUsage.leak.toFixed(2)}MB increase`);
  }
  
  // Check storage performance regression
  if (analysis.storageOperations.avg > PERFORMANCE_CONFIG.maxStorageAccessTime) {
    regressions.push(`Storage performance regression: ${analysis.storageOperations.avg.toFixed(2)}ms > ${PERFORMANCE_CONFIG.maxStorageAccessTime}ms`);
  }
  
  if (regressions.length > 0) {
    throw new Error(`Performance regressions detected:\n${regressions.join('\n')}`);
  }
}

/**
 * Clean up DOM for performance testing
 */
function cleanupDOMForPerformance() {
  // Remove all NativeMimic elements
  const elements = document.querySelectorAll('[class*="nativemimic"], [id*="nativemimic"]');
  elements.forEach(el => el.remove());
  
  // Clear any remaining timers
  vi.clearAllTimers();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Stop observers
  if (performanceObserver) {
    performanceObserver.disconnect();
  }
  
  if (mutationObserver) {
    mutationObserver.disconnect();
  }
  
  if (memoryMonitoringInterval) {
    clearInterval(memoryMonitoringInterval);
    memoryMonitoringInterval = null;
  }
}

/**
 * Get current memory usage (simulated in test environment)
 */
function getMemoryUsage(): number {
  // In a real browser environment, this would use:
  // performance.memory?.usedJSHeapSize / 1024 / 1024
  
  // Simulate memory usage based on DOM complexity
  const domNodes = document.querySelectorAll('*').length;
  const baseMemory = 10; // 10MB base
  const memoryPerNode = 0.001; // 1KB per DOM node
  
  return baseMemory + (domNodes * memoryPerNode) + Math.random() * 2;
}

/**
 * Simulate CPU usage measurement
 */
function simulateCPUUsage(): number {
  // Simulate CPU usage based on recent activity
  const recentRenders = performanceMetrics.renderTimes.slice(-5);
  const avgRenderTime = recentRenders.reduce((a, b) => a + b, 0) / recentRenders.length || 0;
  
  // Convert render time to CPU usage percentage (rough simulation)
  const cpuUsage = Math.min((avgRenderTime / 10) * 100, 100);
  return cpuUsage;
}

/**
 * Calculate percentile of array
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Performance testing utilities
 */
export const PerformanceTestUtils = {
  // Measure function execution time
  measureTime: async <T>(fn: () => Promise<T> | T, name: string): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    performance.mark(`${name}-start`);
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    return { result, duration };
  },
  
  // Create performance stress test
  stressTest: async (operation: () => Promise<void>, iterations: number, concurrency = 1) => {
    const results = [];
    
    for (let batch = 0; batch < iterations; batch += concurrency) {
      const batchPromises = [];
      
      for (let i = 0; i < Math.min(concurrency, iterations - batch); i++) {
        batchPromises.push(PerformanceTestUtils.measureTime(operation, `stress-${batch + i}`));
      }
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return {
      totalIterations: iterations,
      avgDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
      minDuration: Math.min(...results.map(r => r.duration)),
      maxDuration: Math.max(...results.map(r => r.duration)),
      p95Duration: percentile(results.map(r => r.duration), 0.95)
    };
  },
  
  // Memory usage tracking
  trackMemoryUsage: (operation: () => void) => {
    const beforeMemory = getMemoryUsage();
    operation();
    const afterMemory = getMemoryUsage();
    
    return {
      before: beforeMemory,
      after: afterMemory,
      delta: afterMemory - beforeMemory
    };
  }
};

// Export performance configuration and metrics
export {
  PERFORMANCE_CONFIG,
  performanceMetrics,
  getMemoryUsage
};