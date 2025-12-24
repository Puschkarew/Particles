#!/usr/bin/env node
/**
 * Script to check if all scenes are accessible via the server
 */

import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SPLATS_DIR = join(__dirname, 'assets', 'splats');
const SERVER_URL = 'http://localhost:5555';

// Valid scene file extensions
const validExtensions = ['.ply', '.sog', '.splat', '.ksplat', '.spz'];

console.log('🔍 Checking scenes availability...\n');

// Check if directory exists
if (!existsSync(SPLATS_DIR)) {
    console.error(`❌ Directory does not exist: ${SPLATS_DIR}`);
    process.exit(1);
}

// Read directory
const files = readdirSync(SPLATS_DIR).filter(file => {
    const filePath = join(SPLATS_DIR, file);
    try {
        const fileStats = statSync(filePath);
        if (!fileStats.isFile()) {
            return false;
        }
        const ext = file.toLowerCase().substring(file.lastIndexOf('.'));
        return validExtensions.includes(ext);
    } catch (err) {
        return false;
    }
});

console.log(`Found ${files.length} scene files:\n`);

// Check API endpoint
let apiScenes = [];
try {
    const response = await fetch(`${SERVER_URL}/api/scenes`);
    if (response.ok) {
        const data = await response.json();
        apiScenes = data.scenes || [];
        console.log(`✅ API endpoint accessible: ${apiScenes.length} scenes returned\n`);
    } else {
        console.error(`❌ API endpoint returned status ${response.status}`);
    }
} catch (error) {
    console.error(`❌ Failed to fetch from API: ${error.message}`);
    console.log(`   Make sure server is running on ${SERVER_URL}\n`);
}

// Check each file
let allOk = true;
const results = [];

for (const file of files) {
    const encodedFilename = encodeURIComponent(file);
    const url = `${SERVER_URL}/static/assets/splats/${encodedFilename}`;
    
    try {
        const response = await fetch(url, { method: 'HEAD' });
        const status = response.status;
        const ok = status === 200;
        
        if (!ok) {
            allOk = false;
        }
        
        results.push({
            file,
            status,
            ok,
            url
        });
        
        const icon = ok ? '✅' : '❌';
        console.log(`${icon} ${file.padEnd(35)} - HTTP ${status}`);
    } catch (error) {
        allOk = false;
        results.push({
            file,
            status: 'ERROR',
            ok: false,
            url,
            error: error.message
        });
        console.log(`❌ ${file.padEnd(35)} - ERROR: ${error.message}`);
    }
}

// Summary
console.log('\n' + '='.repeat(60));
const successCount = results.filter(r => r.ok).length;
const failCount = results.length - successCount;

console.log(`\n📊 Summary:`);
console.log(`   Total scenes: ${results.length}`);
console.log(`   ✅ Accessible: ${successCount}`);
console.log(`   ❌ Failed: ${failCount}`);

if (apiScenes.length > 0) {
    console.log(`\n📋 API scenes: ${apiScenes.length}`);
    const apiFileNames = new Set(apiScenes.map(s => s.filename));
    const fileNames = new Set(files);
    
    // Check if all files are in API
    const missingInApi = files.filter(f => !apiFileNames.has(f));
    const extraInApi = apiScenes.filter(s => !fileNames.has(s.filename));
    
    if (missingInApi.length > 0) {
        console.log(`   ⚠️  Files not in API: ${missingInApi.join(', ')}`);
        allOk = false;
    }
    if (extraInApi.length > 0) {
        console.log(`   ⚠️  API scenes not in files: ${extraInApi.map(s => s.filename).join(', ')}`);
        allOk = false;
    }
    
    if (missingInApi.length === 0 && extraInApi.length === 0) {
        console.log(`   ✅ All files match API response`);
    }
}

if (allOk && failCount === 0) {
    console.log(`\n✅ All scenes are accessible!`);
    process.exit(0);
} else {
    console.log(`\n❌ Some scenes failed to load`);
    process.exit(1);
}




