// E2E Tests for QuickSpeak Widget Functionality
const { test, expect } = require('@playwright/test');

test.describe('QuickSpeak Widget Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    // Wait for extension to load
    await page.waitForTimeout(1000);
  });

  test('Widget appears on text selection', async ({ page }) => {
    // Select text
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    // Wait for widget to appear
    await page.waitForSelector('#quickspeak-controls', { timeout: 5000 });
    
    // Assert widget is visible
    const widget = page.locator('#quickspeak-controls');
    await expect(widget).toBeVisible();
  });

  test('Widget positions correctly (not off-screen)', async ({ page }) => {
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    
    await page.waitForSelector('#quickspeak-controls');
    
    const widget = page.locator('#quickspeak-controls');
    const bbox = await widget.boundingBox();
    
    // Assert widget is within viewport
    expect(bbox.x).toBeGreaterThan(0);
    expect(bbox.y).toBeGreaterThan(0);
    expect(bbox.x + bbox.width).toBeLessThan(await page.viewportSize().width);
    expect(bbox.y + bbox.height).toBeLessThan(await page.viewportSize().height);
  });

  test('Widget moves to new selections', async ({ page }) => {
    // First selection
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    await page.waitForSelector('#quickspeak-controls');
    
    const firstPosition = await page.locator('#quickspeak-controls').boundingBox();
    
    // Second selection
    await page.evaluate(() => {
      window.testHelpers.selectText('french-text');
    });
    
    // Wait for widget to move
    await page.waitForTimeout(500);
    const secondPosition = await page.locator('#quickspeak-controls').boundingBox();
    
    // Assert widget moved
    expect(firstPosition.x).not.toBe(secondPosition.x);
  });

  test('Widget drag functionality works', async ({ page }) => {
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    await page.waitForSelector('#quickspeak-controls');
    
    const widget = page.locator('#quickspeak-controls');
    const initialPosition = await widget.boundingBox();
    
    // Drag widget to new position
    await widget.dragTo(page.locator('body'), { 
      targetPosition: { x: initialPosition.x + 100, y: initialPosition.y + 50 }
    });
    
    const newPosition = await widget.boundingBox();
    
    // Assert widget moved
    expect(Math.abs(newPosition.x - (initialPosition.x + 100))).toBeLessThan(10);
    expect(Math.abs(newPosition.y - (initialPosition.y + 50))).toBeLessThan(10);
  });

  test('Widget remembers drag position', async ({ page }) => {
    // First selection and drag
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    await page.waitForSelector('#quickspeak-controls');
    
    const widget = page.locator('#quickspeak-controls');
    await widget.dragTo(page.locator('body'), { 
      targetPosition: { x: 200, y: 200 }
    });
    
    const draggedPosition = await widget.boundingBox();
    
    // Close widget
    await page.click('#quickspeak-close');
    
    // New selection should appear at dragged position
    await page.evaluate(() => {
      window.testHelpers.selectText('french-text');
    });
    await page.waitForSelector('#quickspeak-controls');
    
    const rememberedPosition = await widget.boundingBox();
    
    // Assert position was remembered (within 20px tolerance)
    expect(Math.abs(rememberedPosition.x - draggedPosition.x)).toBeLessThan(20);
    expect(Math.abs(rememberedPosition.y - draggedPosition.y)).toBeLessThan(20);
  });

  test('Widget handles edge selections correctly', async ({ page }) => {
    // Test near screen edges
    await page.evaluate(() => {
      window.testHelpers.selectText('right-column');
    });
    await page.waitForSelector('#quickspeak-controls');
    
    const widget = page.locator('#quickspeak-controls');
    const bbox = await widget.boundingBox();
    const viewport = page.viewportSize();
    
    // Assert widget stays within viewport
    expect(bbox.x + bbox.width).toBeLessThan(viewport.width);
    expect(bbox.y + bbox.height).toBeLessThan(viewport.height);
  });

  test('Widget closes with X button', async ({ page }) => {
    await page.evaluate(() => {
      window.testHelpers.selectText('english-short');
    });
    await page.waitForSelector('#quickspeak-controls');
    
    // Click close button
    await page.click('#quickspeak-close');
    
    // Assert widget is hidden
    await expect(page.locator('#quickspeak-controls')).not.toBeVisible();
  });

  test('Widget handles multiple rapid selections', async ({ page }) => {
    const selections = ['english-short', 'french-text', 'spanish-text', 'german-text'];
    
    for (const selection of selections) {
      await page.evaluate((sel) => {
        window.testHelpers.selectText(sel);
      }, selection);
      
      // Brief pause between selections
      await page.waitForTimeout(200);
    }
    
    // Widget should still be responsive
    await page.waitForSelector('#quickspeak-controls');
    const widget = page.locator('#quickspeak-controls');
    await expect(widget).toBeVisible();
  });
});