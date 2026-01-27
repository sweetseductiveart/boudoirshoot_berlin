#!/usr/bin/env node

/**
 * E2E Modal Zoom Tests
 * Testet die komplette Modal-Funktionalität: Open, Close, Navigation
 */

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const BASE_URL = 'http://localhost:8000';

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

async function runModalTests() {
  let serverProcess = null;
  
  try {
    // Starte Server
    serverProcess = await startServer();

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

  let passed = 0;
  let failed = 0;
  const errors = [];

  async function test(name, fn) {
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (e) {
      console.log(`❌ ${name}`);
      errors.push(`${name}: ${e.message}`);
      failed++;
    }
  }

  console.log('🧪 E2E TESTS - Modal Zoom Funktionalität\n');
  console.log('==================================================');

  // Test 1: Modal öffnet beim Thumbnail-Klick
  await test('Modal öffnet beim Thumbnail-Klick', async () => {
    await page.locator('[aria-controls="tab-location"]').click();
    await page.waitForTimeout(300);
    
    // Klick auf Studio Tab, um die Galerie sichtbar zu machen
    await page.locator('.studio-tab[data-studio="studio3"]').click();
    await page.waitForTimeout(300);

    const modalInitial = await page.locator('#gallery-zoom-modal').evaluate(el => 
      el.classList.contains('active')
    );
    if (modalInitial) throw new Error('Modal sollte initial geschlossen sein');

    await page.locator('#studio3-gallery .gallery-thumb').first().click();
    await page.waitForTimeout(300);

    const modalOpen = await page.locator('#gallery-zoom-modal').evaluate(el => 
      el.classList.contains('active')
    );
    if (!modalOpen) throw new Error('Modal sollte offen sein');

    const imgSrc = await page.locator('#zoom-image').getAttribute('src');
    if (!imgSrc) throw new Error('Bild sollte gesetzt sein');
  });

  // Test 2: Modal schließt mit ESC-Taste
  await test('Modal schließt mit ESC-Taste', async () => {
    await page.locator('[aria-controls="tab-location"]').click();
    await page.waitForTimeout(300);
    await page.locator('.studio-tab[data-studio="studio3"]').click();
    await page.waitForTimeout(300);
    await page.locator('#studio3-gallery .gallery-thumb').first().click();
    await page.waitForTimeout(300);

    let modalActive = await page.locator('#gallery-zoom-modal').evaluate(el => 
      el.classList.contains('active')
    );
    if (!modalActive) throw new Error('Modal sollte offen sein');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    modalActive = await page.locator('#gallery-zoom-modal').evaluate(el => 
      el.classList.contains('active')
    );
    if (modalActive) throw new Error('Modal sollte geschlossen sein');
  });

  // Test 3: Modal schließt mit Close-Button
  await test('Modal schließt mit Close-Button', async () => {
    await page.locator('[aria-controls="tab-location"]').click();
    await page.waitForTimeout(300);
    await page.locator('.studio-tab[data-studio="studio3"]').click();
    await page.waitForTimeout(300);
    await page.locator('#studio3-gallery .gallery-thumb').first().click();
    await page.waitForTimeout(300);

    let modalActive = await page.locator('#gallery-zoom-modal').evaluate(el => 
      el.classList.contains('active')
    );
    if (!modalActive) throw new Error('Modal sollte offen sein');

    await page.locator('.gallery-zoom-modal__close').click();
    await page.waitForTimeout(300);

    modalActive = await page.locator('#gallery-zoom-modal').evaluate(el => 
      el.classList.contains('active')
    );
    if (modalActive) throw new Error('Modal sollte geschlossen sein');
  });

  // Test 4: Modal schließt mit Overlay-Klick
  await test('Modal schließt mit Overlay-Klick', async () => {
    await page.locator('[aria-controls="tab-location"]').click();
    await page.waitForTimeout(300);
    await page.locator('.studio-tab[data-studio="studio3"]').click();
    await page.waitForTimeout(300);
    await page.locator('#studio3-gallery .gallery-thumb').first().click();
    await page.waitForTimeout(300);

    await page.click('#gallery-zoom-modal', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    const modalActive = await page.locator('#gallery-zoom-modal').evaluate(el => 
      el.classList.contains('active')
    );
    if (modalActive) throw new Error('Modal sollte geschlossen sein');
  });

  // Test 5: Next Button zeigt nächstes Bild
  await test('Next Button zeigt nächstes Bild', async () => {
    await page.locator('[aria-controls="tab-location"]').click();
    await page.waitForTimeout(300);
    await page.locator('.studio-tab[data-studio="studio3"]').click();
    await page.waitForTimeout(300);
    await page.locator('#studio3-gallery .gallery-thumb').first().click();
    await page.waitForTimeout(300);

    const firstImg = await page.locator('#zoom-image').getAttribute('src');

    await page.locator('.modal-nav--next').click();
    await page.waitForTimeout(300);

    const secondImg = await page.locator('#zoom-image').getAttribute('src');
    if (secondImg === firstImg) throw new Error('Bild sollte sich geändert haben');
  });

  // Test 6: Prev Button zeigt vorheriges Bild
  await test('Prev Button zeigt vorheriges Bild', async () => {
    await page.locator('[aria-controls="tab-location"]').click();
    await page.waitForTimeout(300);
    await page.locator('.studio-tab[data-studio="studio3"]').click();
    await page.waitForTimeout(300);
    await page.locator('#studio3-gallery .gallery-thumb').first().click();
    await page.waitForTimeout(300);

    await page.locator('.modal-nav--next').click();
    await page.waitForTimeout(300);

    const secondImg = await page.locator('#zoom-image').getAttribute('src');

    await page.locator('.modal-nav--prev').click();
    await page.waitForTimeout(300);

    const firstImg = await page.locator('#zoom-image').getAttribute('src');
    if (firstImg === secondImg) throw new Error('Bild sollte sich geändert haben');
  });

  // Test 7: Keyboard Navigation ArrowRight
  await test('Keyboard Navigation: Arrow Right', async () => {
    await page.locator('[aria-controls="tab-location"]').click();
    await page.waitForTimeout(300);
    await page.locator('.studio-tab[data-studio="studio3"]').click();
    await page.waitForTimeout(300);
    await page.locator('#studio3-gallery .gallery-thumb').first().click();
    await page.waitForTimeout(300);

    const firstImg = await page.locator('#zoom-image').getAttribute('src');

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);

    const nextImg = await page.locator('#zoom-image').getAttribute('src');
    if (nextImg === firstImg) throw new Error('Bild sollte sich geändert haben');
  });

  // Test 8: Keyboard Navigation ArrowLeft
  await test('Keyboard Navigation: Arrow Left', async () => {
    await page.locator('[aria-controls="tab-location"]').click();
    await page.waitForTimeout(300);
    await page.locator('.studio-tab[data-studio="studio3"]').click();
    await page.waitForTimeout(300);
    await page.locator('#studio3-gallery .gallery-thumb').first().click();
    await page.waitForTimeout(300);

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    const secondImg = await page.locator('#zoom-image').getAttribute('src');

    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);

    const firstImg = await page.locator('#zoom-image').getAttribute('src');
    if (firstImg === secondImg) throw new Error('Bild sollte sich geändert haben');
  });

  // Test 9: Bilder-Zyklus (Karussell-Verhalten)
  await test('Bilder-Zyklus: Next wraps zum ersten Bild', async () => {
    await page.locator('[aria-controls="tab-location"]').click();
    await page.waitForTimeout(300);
    await page.locator('.studio-tab[data-studio="studio3"]').click();
    await page.waitForTimeout(300);
    
    // Öffne Modal mit erstem Bild
    await page.locator('#studio3-gallery .gallery-thumb').first().click();
    await page.waitForTimeout(300);

    // Hole Anzahl der Bilder
    const thumbCount = await page.locator('#studio3-gallery .gallery-thumb').count();
    
    // Gehe durch alle Bilder bis zum letzten
    for (let i = 1; i < thumbCount; i++) {
      await page.locator('.modal-nav--next').click();
      await page.waitForTimeout(150);
    }

    const lastImg = await page.locator('#zoom-image').getAttribute('src');
    
    // Klicke Next nochmal - sollte zum ersten Bild zurück-zyklieren
    await page.locator('.modal-nav--next').click();
    await page.waitForTimeout(300);

    const firstImg = await page.locator('#zoom-image').getAttribute('src');
    
    // Überprüfe, dass wir zum ersten Bild zurück sind (nicht das letzte)
    if (firstImg === lastImg) throw new Error('Modal sollte zyklieren, nicht beim letzten Bild bleiben');
  });

    await page.close();
    await browser.close();

    console.log('\n==================================================');
    console.log(`\n📊 ERGEBNIS: ${passed}/${passed + failed} bestanden`);
    
    if (failed > 0) {
      console.log('\n❌ FEHLER:');
      errors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('\n🎉 ALLE MODAL TESTS ERFOLGREICH!');
    }

    console.log('\n==================================================\n');

    return { passed, failed };
  } finally {
    // Beende Server
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

module.exports = { runModalTests };

// Wenn direkt aufgerufen
if (require.main === module) {
  runModalTests().then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}
