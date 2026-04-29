#!/usr/bin/env node
/**
 * Vercel pre-build script for VoteChain.
 * Validates optional environment variables and prints a configuration summary.
 * Missing variables are non-fatal; the app degrades gracefully.
 */

'use strict';

const REQUIRED_AT_RUNTIME = [
  'REACT_APP_API_URL',
];

const OPTIONAL = [
  'REACT_APP_ELECTION_NAME',
  'REACT_APP_BLOCKCHAIN_EXPLORER',
];

let hasWarning = false;

console.log('\n=== VoteChain Vercel Pre-build ===\n');

for (const key of REQUIRED_AT_RUNTIME) {
  if (!process.env[key]) {
    console.warn(`  [WARN] ${key} is not set — API calls will fall back to relative paths.`);
    hasWarning = true;
  } else {
    console.log(`  [OK]   ${key} = ${process.env[key]}`);
  }
}

for (const key of OPTIONAL) {
  if (!process.env[key]) {
    console.log(`  [INFO] ${key} not set, using built-in default.`);
  } else {
    console.log(`  [OK]   ${key} = ${process.env[key]}`);
  }
}

if (hasWarning) {
  console.log('\n  Some env vars are missing. See PRODUCTION_CHECKLIST.md for details.\n');
} else {
  console.log('\n  All environment variables look good.\n');
}

console.log('=== Pre-build complete ===\n');
