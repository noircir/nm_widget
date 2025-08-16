#!/usr/bin/env node
/**
 * Parse Performance Results Script - NativeMimic v4.0
 * 
 * Parses performance test results and outputs markdown summary
 * for CI/CD integration and reporting
 */

const fs = require('fs');
const path = require('path');

function parsePerformanceResults() {
  try {
    // Look for performance results in various locations
    const resultPaths = [
      'test-artifacts/performance-test-results/test-results.json',
      'coverage/test-results.json',
      'test-results/performance.json'
    ];
    
    let results = null;
    let resultPath = null;
    
    for (const p of resultPaths) {
      if (fs.existsSync(p)) {
        results = JSON.parse(fs.readFileSync(p, 'utf8'));
        resultPath = p;
        break;
      }
    }
    
    if (!results) {
      console.log('No performance results found.');
      return;
    }
    
    console.log(`Performance results loaded from: ${resultPath}`);
    console.log('');
    
    // Extract and format performance metrics
    const metrics = extractPerformanceMetrics(results);
    
    // Generate markdown output
    generateMarkdownOutput(metrics);
    
  } catch (error) {
    console.error('Error parsing performance results:', error.message);
  }
}

function extractPerformanceMetrics(results) {
  const metrics = {
    summary: {
      totalTests: results.testCount || results.total || 0,
      passedTests: results.passedCount || results.passed || 0,
      failedTests: results.failedCount || results.failed || 0,
      duration: results.duration || 0
    },
    performance: {},
    memory: {},
    rendering: {},
    network: {}
  };
  
  // Extract specific performance metrics
  if (results.performance) {
    metrics.performance = {
      widgetRenderTime: extractMetricValue(results.performance, ['widget-render', 'render'], 'avg'),
      uiUpdateTime: extractMetricValue(results.performance, ['ui-update', 'update'], 'avg'),
      eventHandlingTime: extractMetricValue(results.performance, ['event-handling', 'events'], 'avg'),
      languageDetectionTime: extractMetricValue(results.performance, ['language-detection', 'detection'], 'avg')
    };
  }
  
  if (results.memory) {
    metrics.memory = {
      initialUsage: extractMetricValue(results.memory, ['initial', 'baseline'], 'value'),
      peakUsage: extractMetricValue(results.memory, ['peak', 'max'], 'value'),
      finalUsage: extractMetricValue(results.memory, ['final', 'end'], 'value'),
      leakDetected: extractMetricValue(results.memory, ['leak'], 'detected') || false
    };
  }
  
  if (results.rendering) {
    metrics.rendering = {
      domNodes: extractMetricValue(results.rendering, ['dom-nodes', 'nodes'], 'count'),
      cssTime: extractMetricValue(results.rendering, ['css', 'style'], 'time'),
      layoutTime: extractMetricValue(results.rendering, ['layout', 'reflow'], 'time')
    };
  }
  
  if (results.network) {
    metrics.network = {
      ttsRequestTime: extractMetricValue(results.network, ['tts', 'audio'], 'avg'),
      storageTime: extractMetricValue(results.network, ['storage'], 'avg'),
      requestCount: extractMetricValue(results.network, ['requests'], 'count')
    };
  }
  
  return metrics;
}

function extractMetricValue(obj, keys, property) {
  for (const key of keys) {
    if (obj[key]) {
      const value = obj[key];
      if (typeof value === 'number') return value;
      if (value[property] !== undefined) return value[property];
      if (value.avg !== undefined) return value.avg;
      if (value.average !== undefined) return value.average;
      if (value.value !== undefined) return value.value;
    }
  }
  return undefined;
}

function generateMarkdownOutput(metrics) {
  console.log('### Test Summary');
  console.log(`- **Total Tests:** ${metrics.summary.totalTests}`);
  console.log(`- **Passed:** ${metrics.summary.passedTests}`);
  console.log(`- **Failed:** ${metrics.summary.failedTests}`);
  if (metrics.summary.duration) {
    console.log(`- **Duration:** ${Math.round(metrics.summary.duration)}ms`);
  }
  console.log('');
  
  // Performance metrics
  const perfMetrics = Object.entries(metrics.performance).filter(([_, value]) => value !== undefined);
  if (perfMetrics.length > 0) {
    console.log('### Performance Metrics');
    console.log('| Metric | Value | Status |');
    console.log('|--------|-------|--------|');
    
    for (const [key, value] of perfMetrics) {
      const formattedName = formatMetricName(key);
      const formattedValue = formatMetricValue(key, value);
      const status = getMetricStatus(key, value);
      console.log(`| ${formattedName} | ${formattedValue} | ${status} |`);
    }
    console.log('');
  }
  
  // Memory metrics
  const memMetrics = Object.entries(metrics.memory).filter(([_, value]) => value !== undefined);
  if (memMetrics.length > 0) {
    console.log('### Memory Usage');
    console.log('| Metric | Value |');
    console.log('|--------|-------|');
    
    for (const [key, value] of memMetrics) {
      const formattedName = formatMetricName(key);
      const formattedValue = typeof value === 'boolean' ? (value ? '⚠️ Yes' : '✅ No') : 
                            key.includes('Usage') ? `${value}MB` : value;
      console.log(`| ${formattedName} | ${formattedValue} |`);
    }
    console.log('');
  }
  
  // Rendering metrics
  const renderMetrics = Object.entries(metrics.rendering).filter(([_, value]) => value !== undefined);
  if (renderMetrics.length > 0) {
    console.log('### Rendering Performance');
    console.log('| Metric | Value |');
    console.log('|--------|-------|');
    
    for (const [key, value] of renderMetrics) {
      const formattedName = formatMetricName(key);
      const formattedValue = formatMetricValue(key, value);
      console.log(`| ${formattedName} | ${formattedValue} |`);
    }
    console.log('');
  }
  
  // Network metrics
  const netMetrics = Object.entries(metrics.network).filter(([_, value]) => value !== undefined);
  if (netMetrics.length > 0) {
    console.log('### Network Performance');
    console.log('| Metric | Value |');
    console.log('|--------|-------|');
    
    for (const [key, value] of netMetrics) {
      const formattedName = formatMetricName(key);
      const formattedValue = formatMetricValue(key, value);
      console.log(`| ${formattedName} | ${formattedValue} |`);
    }
    console.log('');
  }
  
  // Performance warnings
  generatePerformanceWarnings(metrics);
}

function formatMetricName(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function formatMetricValue(key, value) {
  if (typeof value === 'boolean') {
    return value ? '✅ Yes' : '❌ No';
  }
  
  if (key.includes('Time') || key.includes('time')) {
    return `${Math.round(value)}ms`;
  }
  
  if (key.includes('Usage') || key.includes('usage')) {
    return `${Math.round(value)}MB`;
  }
  
  if (key.includes('Count') || key.includes('count')) {
    return value.toString();
  }
  
  return Math.round(value).toString();
}

function getMetricStatus(key, value) {
  const thresholds = {
    widgetRenderTime: { good: 50, warning: 100, critical: 200 },
    uiUpdateTime: { good: 20, warning: 50, critical: 100 },
    eventHandlingTime: { good: 10, warning: 30, critical: 100 },
    languageDetectionTime: { good: 100, warning: 200, critical: 500 },
    ttsRequestTime: { good: 1000, warning: 2000, critical: 5000 },
    storageTime: { good: 20, warning: 50, critical: 100 }
  };
  
  const threshold = thresholds[key];
  if (!threshold) return '➖';
  
  if (value <= threshold.good) return '✅ Good';
  if (value <= threshold.warning) return '⚠️ Warning';
  if (value <= threshold.critical) return '🔴 Critical';
  return '🚨 Severe';
}

function generatePerformanceWarnings(metrics) {
  const warnings = [];
  
  // Check for performance issues
  if (metrics.performance.widgetRenderTime > 100) {
    warnings.push('⚠️ Widget rendering is slower than expected');
  }
  
  if (metrics.memory.leakDetected) {
    warnings.push('🚨 Memory leak detected');
  }
  
  if (metrics.memory.peakUsage > 50) {
    warnings.push('⚠️ High memory usage detected');
  }
  
  if (metrics.network.ttsRequestTime > 2000) {
    warnings.push('⚠️ TTS requests are slower than expected');
  }
  
  if (metrics.rendering.domNodes > 1000) {
    warnings.push('⚠️ High DOM complexity detected');
  }
  
  if (warnings.length > 0) {
    console.log('### Performance Warnings');
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
    console.log('');
  }
  
  // Performance recommendations
  const recommendations = generateRecommendations(metrics);
  if (recommendations.length > 0) {
    console.log('### Recommendations');
    for (const rec of recommendations) {
      console.log(`- ${rec}`);
    }
    console.log('');
  }
}

function generateRecommendations(metrics) {
  const recommendations = [];
  
  if (metrics.performance.widgetRenderTime > 100) {
    recommendations.push('Consider optimizing widget rendering performance');
  }
  
  if (metrics.memory.peakUsage > 50) {
    recommendations.push('Review memory usage patterns and implement cleanup strategies');
  }
  
  if (metrics.network.ttsRequestTime > 2000) {
    recommendations.push('Optimize TTS API calls or implement request caching');
  }
  
  if (metrics.rendering.domNodes > 500) {
    recommendations.push('Simplify DOM structure to improve rendering performance');
  }
  
  if (metrics.performance.eventHandlingTime > 30) {
    recommendations.push('Optimize event handling to improve responsiveness');
  }
  
  return recommendations;
}

// Run the script
if (require.main === module) {
  parsePerformanceResults();
}

module.exports = {
  parsePerformanceResults,
  extractPerformanceMetrics,
  generateMarkdownOutput
};