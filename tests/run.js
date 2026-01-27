#!/usr/bin/env node

/**
 * Test Runner - Führt alle Tests aus
 * 
 * Ausführung:
 *   node tests/run.js               (alle Tests)
 *   node tests/run.js regression    (nur Regressionstests)
 *   node tests/run.js e2e           (nur E2E Tests)
 */

const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const testType = args[0] || 'all';

const tests = {
  regression: [
    'tests/regression/gallery.spec.js'
  ],
  e2e: [
    'tests/e2e/gallery-flow.spec.js',
    'tests/e2e/modal.spec.js'
  ]
};

const allTests = [...tests.regression, ...tests.e2e];

function runTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶️  Running: ${testFile}\n`);
    
    const proc = spawn('node', [testFile], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test failed with code ${code}`));
      }
    });
  });
}

async function runAllTests() {
  console.log('🧪 TEST RUNNER\n' + '='.repeat(50));

  let testsToRun = [];
  
  if (testType === 'all') {
    testsToRun = allTests;
    console.log(`Running ALL tests (${allTests.length})\n`);
  } else if (testType === 'regression') {
    testsToRun = tests.regression;
    console.log(`Running REGRESSION tests (${tests.regression.length})\n`);
  } else if (testType === 'e2e') {
    testsToRun = tests.e2e;
    console.log(`Running E2E tests (${tests.e2e.length})\n`);
  } else {
    console.error(`Unknown test type: ${testType}`);
    console.error('Valid options: all, regression, e2e');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  for (const testFile of testsToRun) {
    try {
      await runTest(testFile);
      passed++;
    } catch (error) {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 FINAL RESULT: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
