/**
 * Scene Configuration for Gaussian Splatting Reveal Example
 * Defines available scenes and creates assets
 */

import * as pc from 'playcanvas';

/**
 * Available scenes configuration
 * Note: This list should match the files in engine/examples/assets/splats/
 * The API endpoint /api/scenes is the source of truth, but assets must be pre-configured here
 */
export const AVAILABLE_SCENES = [
    { name: 'Bull 06 Selection', plyFile: 'Bull_06_771ks_Sel.ply', id: 'bull_06_771ks_sel' },
    { name: 'Bull2', plyFile: 'Bull2.ply', id: 'bull2' },
    { name: 'Canyon', plyFile: 'Canyon.ply', id: 'canyon' },
    { name: 'Chair2', plyFile: 'chair2.ply', id: 'chair2' },
    { name: 'Cluster Fly XXL', plyFile: 'cluster fly XXL.ply', id: 'cluster_fly_xxl' },
    { name: 'Future', plyFile: 'Future.ply', id: 'future' },
    { name: 'Gothic Church Kefermarkt', plyFile: 'gothic-church-kefermarkt.ply', id: 'gothic_church_kefermarkt' },
    { name: 'Room', plyFile: 'Room.ply', id: 'room' },
    { name: 'Skull', plyFile: 'skull.sog', id: 'skull' },
    { name: 'Stonehenge', plyFile: 'stonehenge.ply', id: 'stonehenge' }
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
