/**
 * Global Teardown for Playwright E2E Tests - NativeMimic v4.0
 * 
 * Cleans up the testing environment after all tests complete
 */

import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import { rm } from 'fs/promises';
import { resolve } from 'path';

const execAsync = promisify(exec);

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for NativeMimic v4.0 E2E tests...');
  
  try {
    // Step 1: Stop test servers
    await stopTestServers();
    
    // Step 2: Clean up test files
    await cleanupTestFiles();
    
    // Step 3: Generate test reports
    await generateTestReports();
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw to avoid masking test failures
  }
}

/**
 * Stop any running test servers
 */
async function stopTestServers() {
  console.log('🛑 Stopping test servers...');
  
  try {
    // Kill any processes on test ports
    const testPorts = [3000, 3001, 8080];
    
    for (const port of testPorts) {
      try {
        await execAsync(`lsof -ti:${port} | xargs kill -9`);
        console.log(`  - Stopped process on port ${port}`);
      } catch (error) {
        // Port might not be in use, which is fine
      }
    }
    
  } catch (error) {
    console.warn('Warning: Could not stop all test servers:', error);
  }
}

/**
 * Clean up temporary test files
 */
async function cleanupTestFiles() {
  console.log('🗂️ Cleaning up test files...');
  
  const projectRoot = resolve(__dirname, '../../../..');
  
  const pathsToClean = [
    resolve(projectRoot, 'test-results'),
    resolve(projectRoot, 'playwright-report'),
    resolve(__dirname, '../fixtures/temp'),
    resolve(projectRoot, 'artifacts/test-extension')
  ];
  
  for (const path of pathsToClean) {
    try {
      await rm(path, { recursive: true, force: true });
      console.log(`  - Cleaned: ${path}`);
    } catch (error) {
      // File might not exist, which is fine
    }
  }
}

/**
 * Generate final test reports
 */
async function generateTestReports() {
  console.log('📊 Generating test reports...');
  
  try {
    const projectRoot = resolve(__dirname, '../../../..');
    
    // Generate Playwright HTML report if it doesn't exist
    try {
      await execAsync('npx playwright show-report --reporter=html', {
        cwd: projectRoot
      });
    } catch (error) {
      // Report might already exist or no tests were run
    }
    
    console.log('✅ Test reports generated');
    
  } catch (error) {
    console.warn('Warning: Could not generate all test reports:', error);
  }
}

export default globalTeardown;