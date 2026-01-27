#!/usr/bin/env node

/**
 * Regressions-Tests für Gallery-Funktionalität
 * Testet kritische Gallery-Features nach bekannten Bugs
 * 
 * Ausführung:
 *   node tests/regression/gallery.spec.js
 */

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const TESTS = {
  passed: 0,
  failed: 0,
  errors: []
};

// Starte HTTP Server
function startServer() {
  return new Promise((resolve) => {
    const proc = spawn('python', ['-m', 'http.server', '8000', '--directory', '.'], {
      cwd: path.resolve(__dirname, '..', '..'),
      stdio: 'ignore'
    });

    // Gib dem Server Zeit zu starten
    setTimeout(() => {
      resolve(proc);
    }, 1000);
  });
}

async function runTests() {
  let serverProcess = null;
  let browser = null;

  try {
    // Starte Server
    serverProcess = await startServer();

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('🧪 GALLERY REGRESSION TESTS\n');
    console.log('=' .repeat(50));

    await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });

    // TEST 1: Location Tab wird sichtbar
    await test('Location Tab wird sichtbar', async () => {
      const locationTab = await page.$('[aria-controls="tab-location"]');
      await locationTab.click();
      await page.waitForTimeout(300);

      const display = await page.locator('#tab-location').evaluate(el => 
        window.getComputedStyle(el).display
      );
      
      if (display !== 'block') {
        throw new Error(`Expected display: block, got: ${display}`);
      }
    });

    // TEST 2: Studio Tab wird korrekt aktiviert ohne Location zu deaktivieren
    await test('Studio Tab aktivierung deaktiviert nicht Location Tab', async () => {
      const studio3Tab = await page.$('.studio-tab[data-studio="studio3"]');
      await studio3Tab.click();
      await page.waitForTimeout(300);

      const studio3Active = await page.locator('#studio3-gallery').evaluate(el => 
        el.classList.contains('active')
      );

      const locationActive = await page.locator('#tab-location').evaluate(el => 
        el.getAttribute('data-active') === 'true'
      );

      if (!studio3Active) {
        throw new Error('Studio 3 Gallery nicht aktiv');
      }
      if (!locationActive) {
        throw new Error('Location Tab wurde deaktiviert (ARIA/Role Bug!)');
      }
    });

    // TEST 3: Gallery Container haben korrekte Breite
    await test('Gallery Container haben 100% Breite', async () => {
      const width = await page.locator('#studio3-gallery').evaluate(el => {
        const rect = el.getBoundingClientRect();
        return Math.round(rect.width);
      });

      if (width === 0) {
        throw new Error('Gallery hat Breite 0 (CSS width: auto Bug!)');
      }
      if (width < 400) {
        throw new Error(`Gallery Breite zu klein: ${width}px`);
      }
    });

    // TEST 4: Thumbnails sind sichtbar
    await test('Gallery Thumbnails sind sichtbar', async () => {
      const thumbCount = await page.locator('#studio3-gallery .gallery-thumb').count();
      
      if (thumbCount === 0) {
        throw new Error('Keine Thumbnails gefunden');
      }

      const firstThumb = page.locator('#studio3-gallery .gallery-thumb').first();
      const bbox = await firstThumb.boundingBox();

      if (bbox === null) {
        throw new Error('Thumbnails haben keine BoundingBox (nicht sichtbar)');
      }
      if (bbox.width === 0 || bbox.height === 0) {
        throw new Error(`Thumbnail Größe ist 0: ${JSON.stringify(bbox)}`);
      }
    });

    // TEST 5: Thumbnail Klick öffnet Modal
    await test('Thumbnail Klick öffnet Zoom Modal', async () => {
      const firstThumb = page.locator('#studio3-gallery .gallery-thumb').first();
      await firstThumb.click();
      await page.waitForTimeout(300);

      const modalActive = await page.locator('#gallery-zoom-modal').evaluate(el => 
        el.classList.contains('active')
      );

      if (!modalActive) {
        throw new Error('Zoom Modal wurde nach Klick nicht geöffnet');
      }
    });

    // TEST 6: Modal wird geschlossen (ESC oder durch Code)
    await test('Modal kann geschlossen werden (ESC key)', async () => {
      // Drücke ESC um Modal zu schließen
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      const modalActive = await page.locator('#gallery-zoom-modal').evaluate(el => 
        el.classList.contains('active')
      );

      if (modalActive) {
        throw new Error('Modal wurde mit ESC nicht geschlossen');
      }
    });

    // TEST 7: Studio Wechsel funktioniert
    await test('Studio Wechsel zwischen Galerien funktioniert', async () => {
      // Zuerst Modal schließen (falls noch offen)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      const studio4Tab = await page.$('.studio-tab[data-studio="studio4"]');
      await studio4Tab.click();
      await page.waitForTimeout(300);

      const studio3Active = await page.locator('#studio3-gallery').evaluate(el => 
        el.classList.contains('active')
      );

      const studio4Active = await page.locator('#studio4-gallery').evaluate(el => 
        el.classList.contains('active')
      );

      if (studio3Active) {
        throw new Error('Studio 3 Gallery sollte nicht mehr aktiv sein');
      }
      if (!studio4Active) {
        throw new Error('Studio 4 Gallery nicht aktiv');
      }
    });

    // TEST 8: Haupttabs funktionieren noch (Regression)
    await test('Haupttabs (Konzept, Ablauf, etc.) funktionieren noch', async () => {
      // Zuerst Modal schließen
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      const konzeptTab = await page.$('[aria-controls="tab-konzept"]');
      await konzeptTab.click();
      await page.waitForTimeout(300);

      const konzeptActive = await page.locator('#tab-konzept').evaluate(el => 
        el.getAttribute('data-active') === 'true'
      );

      const locationActive = await page.locator('#tab-location').evaluate(el => 
        el.getAttribute('data-active') === 'true'
      );

      if (!konzeptActive) {
        throw new Error('Konzept Tab nicht aktiv');
      }
      if (locationActive) {
        throw new Error('Location Tab sollte nicht mehr aktiv sein');
      }
    });

  } catch (error) {
    console.error('\n❌ KRITISCHER FEHLER:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
    // Beende Server
    if (serverProcess) {
      serverProcess.kill();
    }
  }

  // Print Summary
  printSummary();
  
  if (TESTS.failed > 0) {
    process.exit(1);
  }
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    TESTS.passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Fehler: ${error.message}`);
    TESTS.failed++;
    TESTS.errors.push({ test: name, error: error.message });
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 ERGEBNIS:`);
  console.log(`   ✅ Bestanden: ${TESTS.passed}`);
  console.log(`   ❌ Fehlgeschlagen: ${TESTS.failed}`);
  console.log(`   Total: ${TESTS.passed + TESTS.failed}\n`);

  if (TESTS.failed === 0) {
    console.log('🎉 ALLE TESTS BESTANDEN!\n');
  }
}

runTests();
