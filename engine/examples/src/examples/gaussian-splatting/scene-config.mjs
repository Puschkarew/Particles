/**
 * Scene Configuration for Gaussian Splatting Reveal Example
 * Defines available scenes and creates assets
 */

import * as pc from 'playcanvas';

/**
 * Available scenes configuration
 */
export const AVAILABLE_SCENES = [
    { name: 'Future', plyFile: 'Future.ply', id: 'future' },
    { name: 'Ceramic', plyFile: 'Ceramic.ply', id: 'ceramic' },
    { name: 'Room', plyFile: 'Room.ply', id: 'room' },
    { name: 'The Bull', plyFile: 'the_bull.drc', id: 'the_bull' },
    { name: 'Cluster Fly XXL', plyFile: 'cluster fly XXL.ply', id: 'cluster_fly_xxl' },
    { name: 'Bull 06 Selection', plyFile: 'Bull_06_771ks_Sel.ply', id: 'bull_06' },
    { name: 'Bull2', plyFile: 'Bull2.ply', id: 'bull2' },
    { name: 'Chair', plyFile: 'chair.ply', id: 'chair' },
    { name: 'Chair2', plyFile: 'chair2.ply', id: 'chair2' },
    { name: 'Skull', plyFile: 'skull.sog', id: 'skull' }
];

/**
 * Create assets for all scenes
 * @param {string} rootPath - Root path for assets
 * @returns {object} Assets object with scene assets
 */
export function createSceneAssets(rootPath) {
    const assets = {
        orbit: new pc.Asset('script', 'script', { url: `${rootPath}/static/scripts/camera/orbit-camera.js` })
    };

    // Create assets for each scene
    AVAILABLE_SCENES.forEach(scene => {
        assets[scene.id] = new pc.Asset(`gsplat-${scene.id}`, 'gsplat', { 
            url: `${rootPath}/static/assets/splats/${scene.plyFile}` 
        });
    });

    return assets;
}

/**
 * Get scenes formatted for observer
 * @returns {Array<{name: string, id: string}>} Array of scene objects for observer
 */
export function getScenesForObserver() {
    return AVAILABLE_SCENES.map(s => ({ name: s.name, id: s.id }));
}
