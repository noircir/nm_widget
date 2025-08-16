/**
 * Vitest Reporter Configuration - NativeMimic v4.0
 * 
 * Custom test reporting configuration for comprehensive test insights
 * and CI/CD integration
 */

import { defineConfig } from 'vitest/config';
import type { Reporter } from 'vitest';

// Custom reporter for performance metrics
class PerformanceReporter implements Reporter {
  private startTime = 0;
  private performanceMetrics: Map<string, number[]> = new Map();

  onInit() {
    this.startTime = Date.now();
  }

  onTaskUpdate(task: any) {
    // Track performance metrics for specific tests
    if (task.result?.duration && task.name) {
      const testName = task.name;
      const duration = task.result.duration;
      
      if (!this.performanceMetrics.has(testName)) {
        this.performanceMetrics.set(testName, []);
      }
      this.performanceMetrics.get(testName)!.push(duration);
    }
  }

  onFinished(files: any, errors: any) {
    const totalTime = Date.now() - this.startTime;
    
    // Generate performance report
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration: totalTime,
      testCount: files?.length || 0,
      performance: this.generatePerformanceReport(),
      slowTests: this.findSlowTests(),
      summary: this.generateSummary(files, errors)
    };

    // Save detailed performance data
    const fs = require('fs');
    const path = require('path');
    
    // Ensure coverage directory exists
    const coverageDir = path.resolve(__dirname, '../../../../coverage');
    if (!fs.existsSync(coverageDir)) {
      fs.mkdirSync(coverageDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(coverageDir, 'test-results.json'),
      JSON.stringify(report, null, 2)
    );

    // Log performance summary
    console.log('\n📊 Performance Summary:');
    console.log(`Total test time: ${totalTime}ms`);
    console.log(`Test files: ${files?.length || 0}`);
    
    if (report.slowTests.length > 0) {
      console.log('\n🐌 Slowest tests:');
      report.slowTests.slice(0, 5).forEach((test, i) => {
        console.log(`  ${i + 1}. ${test.name}: ${test.avgDuration}ms`);
      });
    }
  }

  private generatePerformanceReport() {
    const report: any = {};
    
    for (const [testName, durations] of this.performanceMetrics) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      report[testName] = {
        avg: Math.round(avg),
        min,
        max,
        count: durations.length
      };
    }
    
    return report;
  }

  private findSlowTests() {
    const slowTests = [];
    
    for (const [testName, durations] of this.performanceMetrics) {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      
      if (avgDuration > 1000) { // Tests taking more than 1 second
        slowTests.push({
          name: testName,
          avgDuration: Math.round(avgDuration),
          maxDuration: Math.max(...durations),
          runs: durations.length
        });
      }
    }
    
    return slowTests.sort((a, b) => b.avgDuration - a.avgDuration);
  }

  private generateSummary(files: any, errors: any) {
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;

    if (files) {
      files.forEach((file: any) => {
        if (file.tasks) {
          file.tasks.forEach((task: any) => {
            this.countTests(task, (test: any) => {
              totalTests++;
              if (test.result?.state === 'pass') passedTests++;
              else if (test.result?.state === 'fail') failedTests++;
              else if (test.result?.state === 'skip') skippedTests++;
            });
          });
        }
      });
    }

    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      skipped: skippedTests,
      errorCount: errors?.length || 0
    };
  }

  private countTests(task: any, callback: (test: any) => void) {
    if (task.type === 'test') {
      callback(task);
    } else if (task.tasks) {
      task.tasks.forEach((subTask: any) => this.countTests(subTask, callback));
    }
  }
}

// Coverage reporter configuration
const coverageConfig = {
  provider: 'v8' as const,
  reporter: ['text', 'json', 'html', 'lcov', 'clover'],
  reportsDirectory: '../../../../coverage',
  exclude: [
    'node_modules/',
    'dist/',
    'coverage/',
    'artifacts/',
    'v3_31_backup/',
    '**/*.d.ts',
    '**/*.config.{js,ts}',
    '**/*.test.{js,ts}',
    '**/mocks/**',
    '**/fixtures/**',
    '**/setup/**'
  ],
  all: true,
  thresholds: {
    lines: 95,
    functions: 95,
    branches: 90,
    statements: 95
  },
  skipFull: false,
  // Custom coverage reporting
  watermarks: {
    statements: [80, 95] as [number, number],
    functions: [80, 95] as [number, number],
    branches: [70, 90] as [number, number],
    lines: [80, 95] as [number, number]
  }
};

export default defineConfig({
  test: {
    // Use custom performance reporter along with built-in reporters
    reporters: [
      'verbose',
      'json',
      'html',
      new PerformanceReporter()
    ],
    
    outputFile: {
      json: '../../../../coverage/vitest-results.json',
      html: '../../../../coverage/vitest-results.html'
    },
    
    coverage: coverageConfig,
    
    // Test timeout configuration
    testTimeout: 10000,
    hookTimeout: 5000,
    
    // Fail fast configuration
    bail: process.env.CI ? 1 : 0,
    
    // Retry configuration for flaky tests
    retry: process.env.CI ? 2 : 0,
    
    // Environment setup
    setupFiles: [
      '../setup/vitest.setup.ts'
    ],
    
    // Global test configuration
    globals: true,
    environment: 'happy-dom',
    
    // Watch mode configuration
    watch: false,
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true
      }
    },
    
    // Test filtering
    exclude: [
      'node_modules',
      'dist',
      'artifacts',
      'v3_31_backup',
      '**/*.e2e.test.ts'
    ],
    
    // Custom test environment
    testTransformMode: {
      web: ['/\\.[jt]sx?$/'],
      ssr: ['/\\.[jt]sx?$/']
    }
  }
});

// Export for external use
export { PerformanceReporter, coverageConfig };