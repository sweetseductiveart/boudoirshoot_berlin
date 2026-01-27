# Testing Guide

## Überblick

Die Test-Suite ist in drei Kategorien unterteilt:

### 📋 Regressions-Tests (`tests/regression/`)
Kritische Tests, die sicherstellen, dass behobene Bugs nicht wieder auftauchen.

**Fokus:**
- Gallery Container-Widths (CSS Bug)
- Tab-System Integrität (ARIA Role Bug)
- Thumbnail-Sichtbarkeit und Interaktion
- Modal-Funktionalität

**Ausführung:**
```bash
npm run test:regression
node tests/regression/gallery.spec.js
```

### 🌐 End-to-End Tests (`tests/e2e/`)
Simulieren echte User-Flows und komplexe Szenarien.

**Fokus:**
- User navigiert zu Location Tab
- User wechselt zwischen Studios
- User interagiert mit Gallery (Modal, Navigation)
- Haupt-Tab-System funktioniert parallel zu Galerien

**Ausführung:**
```bash
npm run test:e2e
node tests/e2e/gallery-flow.spec.js
```

### 🔍 Debug-Tests (`tests/debug/`)
Alte Debug- und Diagnose-Tests. Hier sind Tests aus der Entwicklungsphase.

Nicht Teil des automatisierten Test-Suites, aber nützlich für manuelle Debugging.

## Alle Tests ausführen

```bash
npm test
# oder
node tests/run.js
```

## Spezifische Test-Kategorien

```bash
# Nur Regression-Tests
npm run test:regression

# Nur E2E Tests
npm run test:e2e

# Alle Tests
npm test
```

## Server starten

Damit die Tests funktionieren, muss der lokale Server laufen:

```bash
npm run server
# oder manuell:
python -m http.server 8000 --directory .
```

## Test-Struktur

```
tests/
├── run.js                    # Test-Runner für alle Tests
├── regression/
│   └── gallery.spec.js      # Gallery Regression-Tests
├── e2e/
│   └── gallery-flow.spec.js # Gallery User-Flow E2E Tests
└── debug/                    # Alte Debug-Tests (optional)
    ├── test-debug*.js
    ├── test-*diagnostic*.js
    └── ...
```

## Bekannte Bugs und entsprechende Tests

### Bug 1: Gallery Container haben keine Breite (CSS)
**Status:** ✅ BEHOBEN
**Fix:** Added `width: 100%` zu `.studio-gallery`, `.studio-tabs`, `.gallery-viewer`
**Test:** `regression/gallery.spec.js` - "Gallery Container haben 100% Breite"

### Bug 2: Studio-Galerien als Haupt-Tabs registriert (ARIA/Role)
**Status:** ✅ BEHOBEN
**Fix:** Entfernt `role="tabpanel"` aus `.studio-gallery` HTML
**Test:** `regression/gallery.spec.js` - "Studio Tab aktivierung deaktiviert nicht Location Tab"

### Bug 3: Studio-Tabs waren Haupt-Tabs (ARIA/Role)
**Status:** ✅ BEHOBEN
**Fix:** Entfernt `role="tab"` aus `.studio-tab` HTML  
**Test:** `e2e/gallery-flow.spec.js` - "Studio Wechsel während Location Tab aktiv"

## Test-Ergebnisse

Nach lokalen Änderungen sollte man folgende Tests vor dem Commit ausführen:

```bash
# Vollständige Regression Suite
npm run test:regression

# E2E Tests
npm run test:e2e

# Beide zusammen
npm test
```

### Erfolgreiches Ergebnis:
```
✅ All tests passed!
```

### Fehlerfall:
Tests zeigen genaue Fehlerquelle an. Debug-Tests in `tests/debug/` können für weitere Diagnostik genutzt werden.

## Playwright Headless vs Headless Mode

- **Regressions-Tests:** `headless: true` (schneller, zuverlässiger)
- **Debug/Visual Tests:** `headless: false` (sieht den Browser)

Einige Rendering-Bugs treten nur in einem Modus auf, daher wichtig zu wissen!

## Erweiterung der Tests

### Neuen Test hinzufügen

```javascript
// tests/regression/neue-kategorie.spec.js

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    TESTS.passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    TESTS.failed++;
  }
}

// Dann in run.js hinzufügen:
// tests.regression.push('tests/regression/neue-kategorie.spec.js');
```

## Troubleshooting

### Tests schlagen fehl: "Cannot reach http://localhost:8000"
→ Server läuft nicht. Starten mit: `npm run server`

### Tests zeigen "Element not visible"
→ Mögliches Timing-Problem. `waitForTimeout()` erhöhen.

### Tests bestehen lokal, aber CI fehlschlagen
→ Unterschiedliche Bildschirmgröße oder Viewport. Playwright automatisiert dies, aber kann variabel sein.

## CI/CD Integration

Die Tests können in GitHub Actions/andere CI eingebunden werden:

```yaml
- name: Install dependencies
  run: npm install

- name: Start server
  run: npm run server &

- name: Run tests
  run: npm test
```
