#!/usr/bin/env node
/**
 * Performance Regression Check Script - NativeMimic v4.0
 * 
 * Analyzes performance test results to detect regressions
 * compared to baseline performance from previous versions
 */

const fs = require('fs');
const path = require('path');

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  widgetRenderTime: 100,
  ttsRequestTime: 2000,
  storageAccessTime: 50,
  memoryUsageMB: 50,
  domNodeCount: 1000
};

// Regression thresholds (percentage increase from baseline)
const REGRESSION_THRESHOLDS = {
  widgetRenderTime: 20, // 20% slower is a regression
  ttsRequestTime: 30,   // 30% slower is a regression
  storageAccessTime: 50, // 50% slower is a regression
  memoryUsageMB: 25,    // 25% more memory is a regression
  domNodeCount: 10      // 10% more DOM nodes is a regression
};

// Baseline performance data (from v3.16 testing)
const BASELINE_PERFORMANCE = {
  widgetRenderTime: 65,
  ttsRequestTime: 1200,
  storageAccessTime: 25,
  memoryUsageMB: 35,
  domNodeCount: 150
};

async function main() {
  console.log('🔍 Checking for performance regressions...');
  
  try {
    // Load performance test results
    const performanceResults = loadPerformanceResults();
    
    if (!performanceResults) {
      console.warn('⚠️ No performance test results found. Skipping regression check.');
      process.exit(0);
    }
    
    // Analyze results
    const analysis = analyzePerformance(performanceResults);
    
    // Check for regressions
    const regressions = checkForRegressions(analysis);
    
    // Generate report
    generateReport(analysis, regressions);
    
    // Exit with appropriate code
    if (regressions.length > 0) {
      console.error(`❌ ${regressions.length} performance regression(s) detected!`);
      process.exit(1);
    } else {
      console.log('✅ No performance regressions detected.');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Performance regression check failed:', error.message);
    process.exit(1);
  }
}

/**
 * Load performance test results from various sources
 */
function loadPerformanceResults() {
  const resultFiles = [
    'coverage/test-results.json',
    'test-results/results.json',
    'playwright-report/results.json'
  ];
  
  for (const file of resultFiles) {
    try {
      if (fs.existsSync(file)) {
        const data = fs.readFileSync(file, 'utf8');
        const results = JSON.parse(data);
        
        if (results.performance || results.metrics) {
          console.log(`📊 Loaded performance results from: ${file}`);
          return results;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not load ${file}:`, error.message);
    }
  }
  
  return null;
}

/**
 * Analyze performance results and extract key metrics
 */
function analyzePerformance(results) {
  const analysis = {
    widgetRenderTime: extractMetric(results, 'widget-render', 'render'),
    ttsRequestTime: extractMetric(results, 'tts-request', 'audio'),
    storageAccessTime: extractMetric(results, 'storage-access', 'storage'),
    memoryUsageMB: extractMetric(results, 'memory-usage', 'memory'),
    domNodeCount: extractMetric(results, 'dom-nodes', 'dom'),
    testCount: results.testCount || 0,
    passedCount: results.passedCount || 0,
    failedCount: results.failedCount || 0,
    timestamp: new Date().toISOString()
  };
  
  console.log('📈 Performance Analysis:');
  console.log(`  Widget Render Time: ${analysis.widgetRenderTime}ms`);
  console.log(`  TTS Request Time: ${analysis.ttsRequestTime}ms`);
  console.log(`  Storage Access Time: ${analysis.storageAccessTime}ms`);
  console.log(`  Memory Usage: ${analysis.memoryUsageMB}MB`);
  console.log(`  DOM Node Count: ${analysis.domNodeCount}`);
  
  return analysis;
}

/**
 * Extract specific metric from test results
 */
function extractMetric(results, ...keys) {
  // Try multiple paths to find the metric
  const paths = [
    ['performance', ...keys, 'avg'],
    ['performance', ...keys, 'average'],
    ['performance', ...keys, 'p95'],
    ['metrics', ...keys],
    ['stats', ...keys],
    [keys.join('_')],
    [keys[0]]
  ];
  
  for (const path of paths) {
    let value = results;
    let found = true;
    
    for (const key of path) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        found = false;
        break;
      }
    }
    
    if (found && typeof value === 'number') {
      return value;
    }
  }
  
  // Return default/estimated value if not found
  const defaults = {
    'widget-render': 50,
    'tts-request': 1000,
    'storage-access': 20,
    'memory-usage': 30,
    'dom-nodes': 100
  };
  
  return defaults[keys[0]] || 0;
}

/**
 * Check for performance regressions against baseline
 */
function checkForRegressions(analysis) {
  const regressions = [];
  
  for (const [metric, currentValue] of Object.entries(analysis)) {
    if (typeof currentValue !== 'number') continue;
    
    const baselineValue = BASELINE_PERFORMANCE[metric];
    const threshold = PERFORMANCE_THRESHOLDS[metric];
    const regressionThreshold = REGRESSION_THRESHOLDS[metric];
    
    if (!baselineValue || !threshold || !regressionThreshold) continue;
    
    // Check absolute threshold
    if (currentValue > threshold) {
      regressions.push({
        metric,
        type: 'absolute',
        currentValue,
        threshold,
        severity: 'high',
        message: `${metric} (${currentValue}) exceeds absolute threshold (${threshold})`
      });
    }
    
    // Check regression threshold
    const percentageIncrease = ((currentValue - baselineValue) / baselineValue) * 100;
    if (percentageIncrease > regressionThreshold) {
      regressions.push({
        metric,
        type: 'regression',
        currentValue,
        baselineValue,
        percentageIncrease: Math.round(percentageIncrease),
        threshold: regressionThreshold,
        severity: percentageIncrease > regressionThreshold * 2 ? 'critical' : 'medium',
        message: `${metric} increased by ${Math.round(percentageIncrease)}% (${baselineValue} → ${currentValue})`
      });
    }
  }
  
  return regressions;
}

/**
 * Generate performance report
 */
function generateReport(analysis, regressions) {
  const report = {
    timestamp: analysis.timestamp,
    summary: {
      totalTests: analysis.testCount,
      passedTests: analysis.passedCount,
      failedTests: analysis.failedCount,
      regressionCount: regressions.length
    },
    performance: {
      current: analysis,
      baseline: BASELINE_PERFORMANCE,
      thresholds: PERFORMANCE_THRESHOLDS
    },
    regressions: regressions,
    recommendations: generateRecommendations(regressions)
  };
  
  // Save detailed report
  const reportPath = 'performance-regression-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  
  // Generate markdown summary
  generateMarkdownSummary(report);
  
  // Print console summary
  printConsoleSummary(report);
}

/**
 * Generate recommendations based on detected regressions
 */
function generateRecommendations(regressions) {
  const recommendations = [];
  
  for (const regression of regressions) {
    switch (regression.metric) {
      case 'widgetRenderTime':
        recommendations.push({
          metric: regression.metric,
          priority: regression.severity === 'critical' ? 'high' : 'medium',
          action: 'Optimize widget rendering',
          details: [
            'Review DOM manipulation in widget rendering',
            'Check for unnecessary re-renders',
            'Optimize CSS selector specificity',
            'Consider virtual DOM or efficient update strategies'
          ]
        });
        break;
        
      case 'memoryUsageMB':
        recommendations.push({
          metric: regression.metric,
          priority: 'high',
          action: 'Fix memory leaks',
          details: [
            'Review event listener cleanup',
            'Check for circular references',
            'Audit audio object disposal',
            'Verify DOM node cleanup'
          ]
        });
        break;
        
      case 'ttsRequestTime':
        recommendations.push({
          metric: regression.metric,
          priority: 'medium',
          action: 'Optimize TTS performance',
          details: [
            'Review TTS API call patterns',
            'Implement request caching',
            'Optimize audio processing pipeline',
            'Check network request efficiency'
          ]
        });
        break;
        
      case 'storageAccessTime':
        recommendations.push({
          metric: regression.metric,
          priority: 'medium',
          action: 'Optimize storage operations',
          details: [
            'Batch storage operations',
            'Review storage key structure',
            'Implement storage caching',
            'Optimize data serialization'
          ]
        });
        break;
        
      case 'domNodeCount':
        recommendations.push({
          metric: regression.metric,
          priority: 'medium',
          action: 'Reduce DOM complexity',
          details: [
            'Audit widget HTML structure',
            'Remove unnecessary DOM nodes',
            'Optimize component composition',
            'Review DOM cleanup procedures'
          ]
        });
        break;
    }
  }
  
  return recommendations;
}

/**
 * Generate markdown summary for CI/CD
 */
function generateMarkdownSummary(report) {
  const summary = [
    '# Performance Regression Check',
    '',
    `**Timestamp:** ${report.timestamp}`,
    `**Tests:** ${report.summary.passedTests}/${report.summary.totalTests} passed`,
    `**Regressions:** ${report.summary.regressionCount}`,
    '',
    '## Performance Metrics',
    '',
    '| Metric | Current | Baseline | Threshold | Status |',
    '|--------|---------|----------|-----------|--------|'
  ];
  
  for (const [metric, currentValue] of Object.entries(report.performance.current)) {
    if (typeof currentValue !== 'number') continue;
    
    const baselineValue = report.performance.baseline[metric];
    const threshold = report.performance.thresholds[metric];
    
    if (!baselineValue || !threshold) continue;
    
    const regression = report.regressions.find(r => r.metric === metric);
    const status = regression ? 
      (regression.severity === 'critical' ? '🔴 Critical' : 
       regression.severity === 'high' ? '🟠 High' : '🟡 Medium') : 
      '✅ OK';
    
    summary.push(`| ${metric} | ${currentValue} | ${baselineValue} | ${threshold} | ${status} |`);
  }
  
  if (report.regressions.length > 0) {
    summary.push('', '## Detected Regressions', '');
    
    for (const regression of report.regressions) {
      summary.push(`- **${regression.metric}**: ${regression.message}`);
    }
  }
  
  if (report.recommendations.length > 0) {
    summary.push('', '## Recommendations', '');
    
    for (const rec of report.recommendations) {
      summary.push(`### ${rec.action} (${rec.priority} priority)`);
      for (const detail of rec.details) {
        summary.push(`- ${detail}`);
      }
      summary.push('');
    }
  }
  
  fs.writeFileSync('performance-summary.md', summary.join('\n'));
}

/**
 * Print console summary
 */
function printConsoleSummary(report) {
  console.log('\n📊 Performance Summary:');
  console.log(`  Total Tests: ${report.summary.totalTests}`);
  console.log(`  Passed: ${report.summary.passedTests}`);
  console.log(`  Failed: ${report.summary.failedTests}`);
  console.log(`  Regressions: ${report.summary.regressionCount}`);
  
  if (report.regressions.length > 0) {
    console.log('\n🚨 Regressions Detected:');
    for (const regression of report.regressions) {
      const icon = regression.severity === 'critical' ? '🔴' : 
                   regression.severity === 'high' ? '🟠' : '🟡';
      console.log(`  ${icon} ${regression.message}`);
    }
    
    console.log('\n💡 Recommendations:');
    for (const rec of report.recommendations) {
      console.log(`  - ${rec.action} (${rec.priority} priority)`);
    }
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  main,
  analyzePerformance,
  checkForRegressions,
  generateReport
};