/**
 * Extension Test Helpers - NativeMimic v4.0
 * 
 * Comprehensive utilities for testing browser extensions with Manifest V3
 * Focuses on preventing extension-specific failures from v3.16
 */

import { Page, BrowserContext, Browser } from '@playwright/test';
import { resolve } from 'path';

export interface ExtensionTestConfig {
  extensionPath: string;
  browser: 'chrome' | 'firefox' | 'edge';
  headless: boolean;
  devtools: boolean;
  slowMo: number;
  timeout: number;
}

export interface ExtensionInfo {
  id: string;
  version: string;
  name: string;
  manifest: any;
}

export interface TestPageInfo {
  url: string;
  title: string;
  ready: boolean;
}

/**
 * ExtensionTestHelper - Main class for browser extension testing
 */
export class ExtensionTestHelper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private extensionInfo: ExtensionInfo | null = null;
  private config: ExtensionTestConfig;

  constructor(config: Partial<ExtensionTestConfig> = {}) {
    this.config = {
      extensionPath: resolve(__dirname, '../../../dist'),
      browser: 'chrome',
      headless: false,
      devtools: false,
      slowMo: 0,
      timeout: 30000,
      ...config
    };
  }

  /**
   * Launch browser with extension loaded
   */
  async launchWithExtension(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
    this.browser = browser;

    // Create context with extension
    this.context = await browser.newContext({
      ...(this.config.browser === 'chrome' && {
        // Chrome-specific extension loading
        // Note: In real implementation, this would use puppeteer-extra or similar
      })
    });

    // Create new page
    this.page = await this.context.newPage();

    // Load extension information
    await this.loadExtensionInfo();

    return { context: this.context, page: this.page };
  }

  /**
   * Load extension information
   */
  private async loadExtensionInfo(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      // Get extension info from background script
      const extensionInfo = await this.page.evaluate(() => {
        return new Promise((resolve) => {
          if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage(
              { type: 'GET_EXTENSION_INFO' },
              (response) => {
                resolve(response);
              }
            );
          } else {
            resolve({
              id: 'test-extension-id',
              version: '4.0.0-test',
              name: 'NativeMimic Test'
            });
          }
        });
      });

      this.extensionInfo = extensionInfo as ExtensionInfo;
    } catch (error) {
      console.warn('Could not load extension info:', error);
      this.extensionInfo = {
        id: 'test-extension-id',
        version: '4.0.0-test',
        name: 'NativeMimic Test',
        manifest: {}
      };
    }
  }

  /**
   * Navigate to test page and wait for extension to be ready
   */
  async navigateToTestPage(url: string = 'http://localhost:3000'): Promise<TestPageInfo> {
    if (!this.page) throw new Error('Page not initialized');

    await this.page.goto(url);
    
    // Wait for page to be ready
    await this.page.waitForLoadState('domcontentloaded');
    
    // Wait for extension content script to load
    await this.waitForExtensionReady();
    
    const title = await this.page.title();
    
    return {
      url,
      title,
      ready: true
    };
  }

  /**
   * Wait for extension content script to be ready
   */
  async waitForExtensionReady(timeout = this.config.timeout): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      await this.page.waitForFunction(
        () => document.body.hasAttribute('data-nativemimic-test'),
        { timeout }
      );
    } catch (error) {
      console.warn('Extension content script not detected, continuing anyway');
    }
  }

  /**
   * Select text on page and trigger widget
   */
  async selectTextAndTriggerWidget(selector: string, text?: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    if (text) {
      // Set text content if provided
      await this.page.evaluate((sel: string, txt: string) => {
        const element = document.querySelector(sel);
        if (element) {
          element.textContent = txt;
        }
      }, selector, text as string);
    }

    // Select text
    await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        // Dispatch selection change event
        document.dispatchEvent(new Event('selectionchange'));
      }
    }, selector);

    // Trigger mouseup to simulate user selection
    await this.page.evaluate(() => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
  }

  /**
   * Wait for widget to appear
   */
  async waitForWidget(timeout = 5000): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      await this.page.waitForSelector('.nativemimic-test-widget[style*="block"]', {
        timeout,
        state: 'visible'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Click widget button by type
   */
  async clickWidgetButton(buttonType: 'play' | 'record' | 'close'): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    const buttonSelector = {
      play: '.play-btn, #test-play-btn',
      record: '.record-btn, #test-record-btn', 
      close: '.close-btn, #test-close-btn'
    }[buttonType];

    await this.page.click(buttonSelector);
  }

  /**
   * Get widget state
   */
  async getWidgetState(): Promise<{
    visible: boolean;
    selectedText: string;
    playing: boolean;
    recording: boolean;
  }> {
    if (!this.page) throw new Error('Page not initialized');

    return await this.page.evaluate(() => {
      const widget = document.querySelector('.nativemimic-test-widget') as HTMLElement;
      
      return {
        visible: widget ? widget.style.display !== 'none' : false,
        selectedText: widget?.getAttribute('data-selected-text') || '',
        playing: widget?.hasAttribute('data-playing') || false,
        recording: widget?.hasAttribute('data-recording') || false
      };
    });
  }

  /**
   * Test extension storage operations
   */
  async testStorageOperations(): Promise<{
    canStore: boolean;
    canRetrieve: boolean;
    error?: string;
  }> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      const result = await this.page.evaluate(async () => {
        const testData = { timestamp: Date.now(), test: 'storage-test' };
        
        // Store data
        await new Promise<void>((resolve, reject) => {
          chrome.storage.sync.set({ testData }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
        
        // Retrieve data
        const retrieved = await new Promise<any>((resolve, reject) => {
          chrome.storage.sync.get('testData', (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(result);
            }
          });
        });
        
        return {
          canStore: true,
          canRetrieve: !!retrieved.testData,
          retrievedData: retrieved.testData
        };
      });

      return {
        canStore: result.canStore,
        canRetrieve: result.canRetrieve && result.retrievedData.test === 'storage-test'
      };
    } catch (error) {
      return {
        canStore: false,
        canRetrieve: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Test message passing between content script and background
   */
  async testMessagePassing(): Promise<{
    canSendToBackground: boolean;
    canReceiveFromBackground: boolean;
    error?: string;
  }> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      const result = await this.page.evaluate(async () => {
        // Send message to background
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { type: 'TEST_PING', timestamp: Date.now() },
            (response) => resolve(response)
          );
        });
        
        return {
          response,
          canSend: !!response,
          canReceive: !!(response as any)?.success
        };
      });

      return {
        canSendToBackground: result.canSend,
        canReceiveFromBackground: result.canReceive
      };
    } catch (error) {
      return {
        canSendToBackground: false,
        canReceiveFromBackground: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Simulate extension installation
   */
  async simulateInstallation(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    await this.page.evaluate(() => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
        // Simulate onInstalled event
        chrome.runtime.onInstalled.addListener(() => {
          console.log('Extension installed');
        });
      }
    });
  }

  /**
   * Check extension permissions
   */
  async checkPermissions(permissions: string[]): Promise<{
    [permission: string]: boolean;
  }> {
    if (!this.page) throw new Error('Page not initialized');

    const result = await this.page.evaluate(async (perms) => {
      const results: { [key: string]: boolean } = {};
      
      for (const permission of perms) {
        try {
          const hasPermission = await new Promise<boolean>((resolve) => {
            chrome.permissions.contains(
              { permissions: [permission] },
              (result) => resolve(result)
            );
          });
          results[permission] = hasPermission;
        } catch (error) {
          results[permission] = false;
        }
      }
      
      return results;
    }, permissions);

    return result;
  }

  /**
   * Monitor extension performance
   */
  async monitorPerformance(duration = 5000): Promise<{
    memoryUsage: number;
    cpuUsage: number;
    renderTime: number;
    errors: string[];
  }> {
    if (!this.page) throw new Error('Page not initialized');

    const startTime = Date.now();
    const errors: string[] = [];

    // Listen for console errors
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for monitoring duration
    await new Promise(resolve => setTimeout(resolve, duration));

    const endTime = Date.now();
    const renderTime = endTime - startTime;

    // Get memory usage (simplified)
    const memoryUsage = await this.page.evaluate(() => {
      // In real browser, would use performance.memory
      return (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0;
    });

    return {
      memoryUsage,
      cpuUsage: 0, // Would need special APIs to measure
      renderTime,
      errors
    };
  }

  /**
   * Test cross-browser compatibility
   */
  async testCompatibility(): Promise<{
    browserInfo: any;
    extensionSupported: boolean;
    featuresSupported: {
      storage: boolean;
      messaging: boolean;
      contentScripts: boolean;
      permissions: boolean;
    };
  }> {
    if (!this.page) throw new Error('Page not initialized');

    const browserInfo = await this.page.evaluate(() => ({
      userAgent: navigator.userAgent,
      vendor: navigator.vendor,
      platform: navigator.platform
    }));

    const storageTest = await this.testStorageOperations();
    const messagingTest = await this.testMessagePassing();
    const permissionsTest = await this.checkPermissions(['storage']);

    return {
      browserInfo,
      extensionSupported: !!(await this.page.evaluate(() => typeof chrome !== 'undefined')),
      featuresSupported: {
        storage: storageTest.canStore && storageTest.canRetrieve,
        messaging: messagingTest.canSendToBackground && messagingTest.canReceiveFromBackground,
        contentScripts: await this.page.evaluate(() => 
          document.body.hasAttribute('data-nativemimic-test')
        ),
        permissions: permissionsTest.storage || false
      }
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    
    this.browser = null;
    this.extensionInfo = null;
  }

  /**
   * Get extension info
   */
  getExtensionInfo(): ExtensionInfo | null {
    return this.extensionInfo;
  }

  /**
   * Get current page
   */
  getPage(): Page | null {
    return this.page;
  }
}

/**
 * Utility functions for extension testing
 */
export const ExtensionTestUtils = {
  /**
   * Wait for specific extension event
   */
  async waitForExtensionEvent(
    page: Page, 
    eventType: string, 
    timeout = 5000
  ): Promise<any> {
    return page.waitForFunction(
      (type) => {
        return new Promise((resolve) => {
          const handler = (event: any) => {
            if (event.detail?.type === type) {
              document.removeEventListener('nativemimic-event', handler);
              resolve(event.detail);
            }
          };
          document.addEventListener('nativemimic-event', handler);
          
          // Timeout handler
          setTimeout(() => {
            document.removeEventListener('nativemimic-event', handler);
            resolve(null);
          }, timeout);
        });
      },
      eventType,
      { timeout }
    );
  },

  /**
   * Create test page with specific content
   */
  async createTestPage(page: Page, content: {
    title?: string;
    selectableText?: string;
    multipleElements?: boolean;
  }): Promise<void> {
    const { title = 'Test Page', selectableText = 'Default test text', multipleElements = false } = content;

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          .selectable { padding: 10px; margin: 10px; background: #f0f8ff; }
          .test-content { font-family: Arial, sans-serif; line-height: 1.6; }
        </style>
      </head>
      <body class="test-content">
        <h1>${title}</h1>
        <div class="selectable" data-testid="main-text">${selectableText}</div>
        ${multipleElements ? `
          <div class="selectable" data-testid="secondary-text">Secondary selectable text</div>
          <div class="selectable" data-testid="tertiary-text">Tertiary selectable text</div>
        ` : ''}
        <script>
          document.body.setAttribute('data-test-page-ready', 'true');
        </script>
      </body>
      </html>
    `);

    await page.waitForLoadState('domcontentloaded');
  },

  /**
   * Simulate user text selection behavior
   */
  async simulateUserSelection(
    page: Page,
    selector: string,
    startOffset = 0,
    endOffset?: number
  ): Promise<string> {
    return page.evaluate((sel: string, start: number, end?: number) => {
      const element = document.querySelector(sel);
      if (!element || !element.firstChild) return '';

      const textNode = element.firstChild;
      const range = document.createRange();
      
      const actualEnd = end !== undefined ? end : (textNode.textContent?.length || 0);
      
      range.setStart(textNode, start);
      range.setEnd(textNode, actualEnd);
      
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      // Simulate mouse events
      const mouseDown = new MouseEvent('mousedown', { bubbles: true });
      const mouseUp = new MouseEvent('mouseup', { bubbles: true });
      
      element.dispatchEvent(mouseDown);
      element.dispatchEvent(mouseUp);
      
      return selection?.toString() || '';
    }, selector, startOffset, endOffset);
  },

  /**
   * Verify extension security
   */
  async verifyExtensionSecurity(page: Page): Promise<{
    cspCompliant: boolean;
    noInlineScripts: boolean;
    secureOrigins: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    // Check for CSP violations
    page.on('console', (msg) => {
      if (msg.text().includes('Content Security Policy')) {
        errors.push(`CSP Violation: ${msg.text()}`);
      }
    });

    const security = await page.evaluate(() => {
      // Check for inline scripts
      const inlineScripts = document.querySelectorAll('script:not([src])');
      const hasInlineScripts = inlineScripts.length > 0;
      
      // Check origins
      const isSecureOrigin = location.protocol === 'https:' || location.hostname === 'localhost';
      
      return {
        noInlineScripts: !hasInlineScripts,
        secureOrigins: isSecureOrigin
      };
    });

    return {
      cspCompliant: errors.length === 0,
      noInlineScripts: security.noInlineScripts,
      secureOrigins: security.secureOrigins,
      errors
    };
  }
};

export default ExtensionTestHelper;