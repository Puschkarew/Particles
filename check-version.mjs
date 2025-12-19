#!/usr/bin/env node
/**
 * Version Consistency Check Script
 * Ensures BUILD_VERSION matches between reveal.example.mjs and reveal.controls.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXAMPLE_FILE = join(__dirname, 'engine/examples/src/examples/gaussian-splatting/reveal.example.mjs');
const CONTROLS_FILE = join(__dirname, 'engine/examples/src/examples/gaussian-splatting/reveal.controls.mjs');

function extractVersion(filePath) {
    try {
        const content = readFileSync(filePath, 'utf-8');
        const match = content.match(/const\s+BUILD_VERSION\s*=\s*['"]([^'"]+)['"]/);
        return match ? match[1] : null;
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        return null;
    }
}

const exampleVersion = extractVersion(EXAMPLE_FILE);
const controlsVersion = extractVersion(CONTROLS_FILE);

if (!exampleVersion) {
    console.error(`❌ Could not find BUILD_VERSION in ${EXAMPLE_FILE}`);
    process.exit(1);
}

if (!controlsVersion) {
    console.error(`❌ Could not find BUILD_VERSION in ${CONTROLS_FILE}`);
    process.exit(1);
}

if (exampleVersion !== controlsVersion) {
    console.error('❌ Version mismatch!');
    console.error(`   reveal.example.mjs:  ${exampleVersion}`);
    console.error(`   reveal.controls.mjs: ${controlsVersion}`);
    process.exit(1);
}

console.log(`✅ Version consistency check passed: ${exampleVersion}`);
process.exit(0);
