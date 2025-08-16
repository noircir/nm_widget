# QuickSpeak CI/CD Testing Strategy

## Comprehensive Pre-Upgrade Testing Pipeline

### 1. Cross-Browser Support Matrix

| Browser | Status | Priority | Test Coverage |
|---------|--------|----------|---------------|
| **Brave** | ✅ Reference | P0 | Full E2E Suite |
| **Chrome** | ❌ Known Issues | P1 | Compatibility Only |
| **Firefox** | 🔄 Testing | P1 | Full E2E Suite |
| **Edge** | 🔄 Testing | P1 | Full E2E Suite |
| **Safari** | 🔄 Testing | P2 | Basic Validation |

### 2. Automated Test Categories

#### **Core Widget Tests**
```javascript
describe('Widget Functionality', () => {
  test('Widget appears on text selection', async ({ page }) => {
    await page.selectText('test content');
    await expect(page.locator('#quickspeak-controls')).toBeVisible();
  });
  
  test('Widget positions correctly (not off-screen)', async ({ page }) => {
    const widget = page.locator('#quickspeak-controls');
    const bbox = await widget.boundingBox();
    expect(bbox.x).toBeGreaterThan(0);
    expect(bbox.y).toBeGreaterThan(0);
  });
  
  test('Widget moves to new selections', async ({ page }) => {
    await page.selectText('first text');
    const pos1 = await page.locator('#quickspeak-controls').boundingBox();
    
    await page.selectText('second text');
    const pos2 = await page.locator('#quickspeak-controls').boundingBox();
    
    expect(pos1).not.toEqual(pos2);
  });
  
  test('Widget drag functionality', async ({ page }) => {
    const widget = page.locator('#quickspeak-controls');
    await widget.dragTo(page.locator('body'), { targetPosition: { x: 100, y: 100 }});
    // Assert position changed and is remembered
  });
});
```

#### **Button Functionality Tests**
```javascript
describe('Button Controls', () => {
  test('Play button triggers speech synthesis', async ({ page }) => {
    await page.selectText('test speech');
    await page.click('#quickspeak-play-pause');
    await expect(page.locator('#quickspeak-play-pause')).toContainText('⏸️');
  });
  
  test('Pause/resume state transitions', async ({ page }) => {
    // Start speech
    await page.click('#quickspeak-play-pause');
    await expect(page.locator('#quickspeak-play-pause')).toContainText('⏸️');
    
    // Pause speech
    await page.click('#quickspeak-play-pause');
    await expect(page.locator('#quickspeak-play-pause')).toContainText('▶️');
  });
  
  test('Speed slider changes rate', async ({ page }) => {
    const slider = page.locator('#quickspeak-speed');
    await slider.fill('1.5');
    await expect(page.locator('#quickspeak-speed-value')).toContainText('1.5x');
  });
  
  test('Settings modal opens and closes', async ({ page }) => {
    await page.click('#quickspeak-skin');
    await expect(page.locator('#quickspeak-skin-modal')).toBeVisible();
    
    await page.click('.quickspeak-modal-close');
    await expect(page.locator('#quickspeak-skin-modal')).not.toBeVisible();
  });
});
```

#### **Keyboard Shortcut Tests**
```javascript
describe('Keyboard Shortcuts', () => {
  test('Ctrl+Shift+E enables/disables extension', async ({ page }) => {
    await page.keyboard.press('Control+Shift+E');
    // Assert extension disabled state
    
    await page.keyboard.press('Control+Shift+E');
    // Assert extension enabled state
  });
  
  test('Ctrl+Shift+S speaks selected text', async ({ page }) => {
    await page.selectText('keyboard test');
    await page.keyboard.press('Control+Shift+S');
    await expect(page.locator('#quickspeak-controls')).toBeVisible();
  });
  
  test('Ctrl+Shift+P pauses/resumes speech', async ({ page }) => {
    await page.selectText('pause test');
    await page.click('#quickspeak-play-pause');
    
    await page.keyboard.press('Control+Shift+P');
    await expect(page.locator('#quickspeak-play-pause')).toContainText('▶️');
  });
  
  test('Ctrl+Shift+ +/- speed controls', async ({ page }) => {
    await page.selectText('speed test');
    await page.click('#quickspeak-play-pause');
    
    await page.keyboard.press('Control+Shift+Equal');
    // Assert speed increased message appears
  });
});
```

#### **Speech Engine Tests**
```javascript
describe('Speech Synthesis', () => {
  test('Text-to-speech produces audio (Brave/Edge/Firefox)', async ({ page, browserName }) => {
    if (browserName === 'chromium') {
      test.skip('Chrome has known speechSynthesis issues');
    }
    
    await page.selectText('audio test');
    await page.click('#quickspeak-play-pause');
    
    // Check if speechSynthesis.speaking becomes true
    const speaking = await page.evaluate(() => speechSynthesis.speaking);
    expect(speaking).toBe(true);
  });
  
  test('Voice selection works', async ({ page }) => {
    // Test voice dropdown and selection
  });
  
  test('Language detection accuracy', async ({ page }) => {
    await page.selectText('Bonjour le monde');
    // Assert French language detected
    
    await page.selectText('Hello world');
    // Assert English language detected
  });
  
  test('Speed adjustment during playback', async ({ page }) => {
    await page.selectText('speed adjustment test');
    await page.click('#quickspeak-play-pause');
    
    const slider = page.locator('#quickspeak-speed');
    await slider.fill('2.0');
    // Assert speech continues with new speed
  });
});
```

### 3. CI/CD Pipeline (GitHub Actions)

```yaml
name: QuickSpeak Comprehensive Tests
on: 
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm test
      
  cross-browser-e2e:
    strategy:
      matrix:
        browser: [brave, chrome, firefox, edge]
        os: [ubuntu-latest, windows-latest, macos-latest]
        exclude:
          # Safari only on macOS
          - browser: safari
            os: ubuntu-latest
          - browser: safari
            os: windows-latest
    runs-on: ${{ matrix.os }}
    steps:
      - name: Setup ${{ matrix.browser }} on ${{ matrix.os }}
        uses: browser-actions/setup-${{ matrix.browser }}@v1
        
      - name: E2E Tests
        run: npm run test:e2e:${{ matrix.browser }}
        
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: test-results-${{ matrix.browser }}-${{ matrix.os }}
          path: test-results/
          
  brave-reference-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Brave Comprehensive Tests (Reference Browser)
        run: |
          npm run test:brave:full
          npm run test:brave:performance
          npm run test:brave:accessibility
          
  extension-validation:
    runs-on: ubuntu-latest
    steps:
      - name: Validate Extension Package
        run: |
          # Check manifest.json validity
          jq . mvp/manifest.json
          
          # Verify all required files present
          test -f mvp/content.js
          test -f mvp/content.css
          test -f mvp/popup.html
          
          # Test extension loading
          npm run validate:extension
          
      - name: Check File Sizes
        run: |
          # Ensure extension stays under size limits
          du -sh mvp/
          
  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Performance Benchmarks
        run: |
          npm run test:performance
          # Widget appears within 300ms
          # Speech starts within 500ms
          # Memory usage under 10MB
```

### 4. Testing Commands

```bash
# Full test suite (all browsers)
npm run test:all

# Browser-specific tests
npm run test:brave      # Reference browser (full suite)
npm run test:chrome     # Compatibility only (expect failures)
npm run test:firefox    # Full suite
npm run test:edge       # Full suite
npm run test:safari     # Basic validation

# Feature-specific tests
npm run test:widgets
npm run test:shortcuts
npm run test:speech
npm run test:modals

# Cross-OS testing
npm run test:macos
npm run test:windows
npm run test:linux

# Performance and load testing
npm run test:performance
npm run test:memory-leaks
npm run test:large-text
```

### 5. Quality Gates & Release Criteria

#### **Pre-commit:**
- ✅ All unit tests pass
- ✅ ESLint passes (no errors)
- ✅ Manifest.json validation
- ✅ No console errors in test runs

#### **Pre-release (Blocking):**
- ✅ **Brave**: All tests pass (reference browser)
- ✅ **Firefox**: All tests pass
- ✅ **Edge**: All tests pass  
- ⚠️ **Chrome**: Compatibility tests pass (speech may fail)
- ✅ **Safari**: Basic validation passes
- ✅ Manual testing checklist complete
- ✅ Performance benchmarks met
- ✅ No memory leaks detected

#### **Post-release Monitoring:**
- 📊 Error rate by browser
- 📊 Speech synthesis success rates
- 📊 User engagement metrics
- 📊 Extension installation/uninstall rates

### 6. Manual Testing Checklist (Before Each Release)

**Core Functionality:**
- [ ] Text selection triggers widget on 3+ websites
- [ ] All keyboard shortcuts work (E, S, P, +/-)
- [ ] Play/pause buttons function correctly
- [ ] Speed slider adjusts rate during speech
- [ ] Widget positioning works on different screen sizes
- [ ] Settings modal opens and saves preferences

**Cross-Browser Verification:**
- [ ] **Brave**: Full workflow works perfectly
- [ ] **Firefox**: All features functional
- [ ] **Edge**: Complete compatibility
- [ ] **Chrome**: Widget works, clear error messaging for speech
- [ ] **Safari**: Basic functionality (if supporting)

**Edge Cases:**
- [ ] Empty text selection handling
- [ ] Very long text (>1000 characters)
- [ ] Special characters and emojis
- [ ] Multiple browser tabs with extension
- [ ] Rapid successive text selections
- [ ] Extension disable/enable during speech

**Performance:**
- [ ] Widget appears within 300ms of selection
- [ ] No memory leaks during extended use
- [ ] Extension loads quickly on page refresh
- [ ] Settings save/load correctly

This comprehensive strategy ensures QuickSpeak maintains high quality across all supported browsers, with Brave as our reference implementation!
