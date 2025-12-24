#!/usr/bin/env node
/**
 * Script to verify that scene-config.mjs matches API response
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVER_URL = 'http://localhost:5555';

console.log('🔍 Verifying scene configuration...\n');

// Fetch scenes from API
let apiScenes = [];
try {
    const response = await fetch(`${SERVER_URL}/api/scenes`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    apiScenes = data.scenes || [];
    console.log(`✅ Fetched ${apiScenes.length} scenes from API\n`);
} catch (error) {
    console.error(`❌ Failed to fetch from API: ${error.message}`);
    process.exit(1);
}

// Read scene-config.mjs
const configPath = join(__dirname, 'src', 'examples', 'gaussian-splatting', 'scene-config.mjs');
const configContent = readFileSync(configPath, 'utf-8');

// Extract AVAILABLE_SCENES array using regex
const scenesMatch = configContent.match(/export const AVAILABLE_SCENES = \[([\s\S]*?)\];/);
if (!scenesMatch) {
    console.error('❌ Could not find AVAILABLE_SCENES in scene-config.mjs');
    process.exit(1);
}

// Parse scenes from config (simple regex parsing)
const configScenes = [];
const sceneRegex = /\{\s*name:\s*['"]([^'"]+)['"],\s*plyFile:\s*['"]([^'"]+)['"],\s*id:\s*['"]([^'"]+)['"]\s*\}/g;
let match;
while ((match = sceneRegex.exec(scenesMatch[1])) !== null) {
    configScenes.push({
        name: match[1],
        plyFile: match[2],
        id: match[3]
    });
}

console.log(`📋 Found ${configScenes.length} scenes in scene-config.mjs\n`);

// Compare
const apiScenesById = new Map(apiScenes.map(s => [s.id, s]));
const configScenesById = new Map(configScenes.map(s => [s.id, s]));

let allMatch = true;

// Check each API scene
console.log('Checking API scenes against config:');
for (const apiScene of apiScenes) {
    const configScene = configScenesById.get(apiScene.id);
    if (!configScene) {
        console.log(`  ❌ ${apiScene.name} (${apiScene.id}) - Missing in config`);
        allMatch = false;
    } else {
        // Check filename match
        if (configScene.plyFile !== apiScene.filename) {
            console.log(`  ⚠️  ${apiScene.name} (${apiScene.id}) - Filename mismatch:`);
            console.log(`     Config: ${configScene.plyFile}`);
            console.log(`     API:    ${apiScene.filename}`);
            allMatch = false;
        } else {
            console.log(`  ✅ ${apiScene.name} (${apiScene.id})`);
        }
    }
}

// Check for scenes in config but not in API
console.log('\nChecking config scenes against API:');
for (const configScene of configScenes) {
    const apiScene = apiScenesById.get(configScene.id);
    if (!apiScene) {
        console.log(`  ❌ ${configScene.name} (${configScene.id}) - Missing in API`);
        allMatch = false;
    }
}

// Summary
console.log('\n' + '='.repeat(60));
if (allMatch && apiScenes.length === configScenes.length) {
    console.log('\n✅ All scenes match between API and config!');
    console.log(`   Total: ${apiScenes.length} scenes`);
    process.exit(0);
} else {
    console.log('\n❌ Mismatches found:');
    console.log(`   API scenes: ${apiScenes.length}`);
    console.log(`   Config scenes: ${configScenes.length}`);
    process.exit(1);
}




