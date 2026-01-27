#!/usr/bin/env node

/**
 * End-to-End Tests für komplette User-Flows
 * 
 * Ausführung:
 *   node tests/e2e/gallery-flow.spec.js
 */

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const TESTS = {
  passed: 0,
  failed: 0,
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
    
    console.log('🌐 E2E TESTS - Gallery User Flow\n');
    console.log('='.repeat(50));

    await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });

    // SCENARIO 1: User navigiert zu Location und schaut sich Galerien an
    await test('User-Flow: Navigation zu Location und Gallery-Durchsicht', async () => {
      // 1. Klick auf Location Tab
      await page.$('[aria-controls="tab-location"]').then(el => el.click());
      await page.waitForTimeout(300);

      let locationActive = await page.locator('#tab-location').evaluate(el => 
        el.getAttribute('data-active') === 'true'
      );
      if (!locationActive) throw new Error('Schritt 1: Location Tab nicht aktiv');

      // 2. Überprüfe dass Studios sichtbar sind
      const studioTabs = await page.locator('.studio-tab').count();
      if (studioTabs < 3) throw new Error(`Schritt 2: Nur ${studioTabs} Studio Tabs gefunden`);

      // 3. Klick auf Studio 3
      await page.$('.studio-tab[data-studio="studio3"]').then(el => el.click());
      await page.waitForTimeout(300);

      let studio3Active = await page.locator('#studio3-gallery').evaluate(el => 
        el.classList.contains('active')
      );
      if (!studio3Active) throw new Error('Schritt 3: Studio 3 nicht aktiv');

      // 4. Überprüfe Thumbnails
      const thumbs = await page.locator('#studio3-gallery .gallery-thumb').count();
      if (thumbs === 0) throw new Error('Schritt 4: Keine Thumbnails in Studio 3');

      // 5. Überprüfe dass Thumbnails sichtbar und klickbar sind
      const firstThumb = page.locator('#studio3-gallery .gallery-thumb').first();
      const thumbVisible = await firstThumb.isVisible();
      if (!thumbVisible) throw new Error('Schritt 5: Thumbnails nicht sichtbar');

      // 6. Klick auf Thumbnail
      await firstThumb.click();
      await page.waitForTimeout(300);

      let modalActive = await page.locator('#gallery-zoom-modal').evaluate(el => 
        el.classList.contains('active')
      );
      if (!modalActive) throw new Error('Schritt 6: Modal nicht geöffnet');

      // 7. Schließe Modal mit ESC
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      modalActive = await page.locator('#gallery-zoom-modal').evaluate(el => 
        el.classList.contains('active')
      );
      if (modalActive) throw new Error('Schritt 7: Modal nicht geschlossen');
    });

    // SCENARIO 2: User wechselt zwischen Studios
    await test('User-Flow: Studio Wechsel während Location Tab aktiv', async () => {
      // Schließe Modal falls offen
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Studio 1
      await page.$('.studio-tab[data-studio="studio1"]').then(el => el.click());
      await page.waitForTimeout(300);

      let studio1Active = await page.locator('#studio1-gallery').evaluate(el => 
        el.classList.contains('active')
      );
      if (!studio1Active) throw new Error('Studio 1 nicht aktiv');

      // Studio 4
      await page.$('.studio-tab[data-studio="studio4"]').then(el => el.click());
      await page.waitForTimeout(300);

      let studio4Active = await page.locator('#studio4-gallery').evaluate(el => 
        el.classList.contains('active')
      );
      if (!studio4Active) throw new Error('Studio 4 nicht aktiv');

      // Überprüfe dass location TAB noch aktiv ist!
      let locationActive = await page.locator('#tab-location').evaluate(el => 
        el.getAttribute('data-active') === 'true'
      );
      if (!locationActive) throw new Error('Location Tab wurde während Studio-Wechsel deaktiviert!');
    });

    // SCENARIO 3: User navigiert zwischen Haupttabs
    await test('User-Flow: Navigation zwischen Haupttabs (Regression)', async () => {
      // Schließe Modal falls offen
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Von Location zu Concept
      await page.$('[aria-controls="tab-konzept"]').then(el => el.click());
      await page.waitForTimeout(300);

      let konzeptActive = await page.locator('#tab-konzept').evaluate(el => 
        el.getAttribute('data-active') === 'true'
      );
      if (!konzeptActive) throw new Error('Konzept nicht aktiv');

      // Zu Kosten
      await page.$('[aria-controls="tab-kosten"]').then(el => el.click());
      await page.waitForTimeout(300);

      let kostenActive = await page.locator('#tab-kosten').evaluate(el => 
        el.getAttribute('data-active') === 'true'
      );
      if (!kostenActive) throw new Error('Kosten nicht aktiv');

      // Back zu Location
      await page.$('[aria-controls="tab-location"]').then(el => el.click());
      await page.waitForTimeout(300);

      let locationActive = await page.locator('#tab-location').evaluate(el => 
        el.getAttribute('data-active') === 'true'
      );
      if (!locationActive) throw new Error('Location nicht aktiv nach Rückkehr');

      // Studios sollten immer noch funktionieren!
      const studio3Tab = await page.$('.studio-tab[data-studio="studio3"]');
      if (!studio3Tab) throw new Error('Studio Tabs nicht vorhanden nach Tab-Wechsel');
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

  printSummary();
  if (TESTS.failed > 0) process.exit(1);
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    TESTS.passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   ${error.message}`);
    TESTS.failed++;
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 ERGEBNIS: ${TESTS.passed}/${TESTS.passed + TESTS.failed} bestanden\n`);
  
  if (TESTS.failed === 0) {
    console.log('🎉 ALLE E2E TESTS ERFOLGREICH!\n');
  }
}

runTests();
