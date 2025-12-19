import fs from 'fs';

import { parseConfig } from '../utils.mjs';

/** @import { Plugin } from 'rollup' */

const EXAMPLE_TEMPLATE = fs.readFileSync('templates/example.html', 'utf-8');

/**
 * Choose engine based on `Example#ENGINE`, e.g. ClusteredLightingExample picks PERFORMANCE.
 *
 * @param {'development' | 'performance' | 'debug'} [type] - The engine type.
 * @returns {string} - The build file.
 */
export const engineUrl = (type) => {
    switch (type) {
        case 'development':
            return './ENGINE_PATH/index.js';
        case 'performance':
            return './playcanvas.prf.mjs';
        case 'debug':
            return './playcanvas.dbg.mjs';
    }
    return './playcanvas.mjs';
};

/**
 * This plugin builds the HTML file for the example.
 *
 * @param {object} data - The data.
 * @param {string} data.categoryKebab - The category kebab name.
 * @param {string} data.exampleNameKebab - The example kebab name.
 * @param {string[]} data.files - The files in the example directory.
 * @param {'development' | 'performance' | 'debug'} [data.engineType] - The engine type.
 * @returns {Plugin} The plugin.
 */
export const buildHtml = ({ categoryKebab, exampleNameKebab, files, engineType }) => {
    return {
        name: 'build-html',
        transform(code) {
            const config = parseConfig(code);

            // Apply templating
            let html = EXAMPLE_TEMPLATE
            .replace(/'@TITLE'/g, `${categoryKebab}: ${exampleNameKebab}`)
            .replace(/'@FILES'/g, JSON.stringify(files))
            .replace(/'@ENGINE'/g, JSON.stringify(engineUrl(engineType ?? config.ENGINE)));
            if (/'@[A-Z0-9_]+'/.test(html)) {
                throw new Error('HTML file still has unreplaced values');
            }

            // Add controls initialization for gaussian-splatting reveal
            if (categoryKebab === 'gaussian-splatting' && exampleNameKebab === 'reveal') {
                const controlsInit = `
            // Initialize controls when example loads (for standalone iframe mode)
            window.addEventListener('exampleLoad', async (event) => {
                const { observer } = event.detail;
                if (observer && !document.getElementById('controlPanel-controls')) {
                    try {
                        // Add version and timestamp to bypass browser cache
                        const { controls } = await import('./gaussian-splatting_reveal.controls.mjs?v=1.4.6&t=' + Date.now());
                        if (controls) {
                            controls({ observer });
                        }
                    } catch (e) {
                        console.error('Failed to load controls:', e);
                    }
                }
            });`;
                html = html.replace(
                    'window.addEventListener(\'beforeunload\', () => loader.exit(), false);',
                    `window.addEventListener('beforeunload', () => loader.exit(), false);${controlsInit}`
                );
            }

            fs.writeFileSync(`dist/iframe/${categoryKebab}_${exampleNameKebab}.html`, html);

            return {
                code,
                map: null
            };
        }
    };
};
