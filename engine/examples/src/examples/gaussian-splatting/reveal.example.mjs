// @config DESCRIPTION This example demonstrates reveal effects for gaussian splats.
import { data } from 'examples/observer';
import { deviceType, rootPath, fileImport } from 'examples/utils';
import * as pc from 'playcanvas';
import { AVAILABLE_SCENES, createSceneAssets, getScenesForObserver } from './scene-config.mjs';
import { loadSettings, saveSettings, initializeAutoSave, SETTINGS_KEYS } from './settings-manager.mjs';
import { applySettingsToRadialScript, applySettingsToRainScript, applySettingsToGridScript, applySettingsToFadeScript, applySettingsToSpreadScript, applySettingsToUnrollScript, applySettingsToTwisterScript, applySettingsToMagicScript, createRadialScript, createRainScript, createGridScript, createEffect, getOrCreateBoxEffect } from './script-factory.mjs';

// Build version for tracking (must match version in reveal.controls.mjs)
const BUILD_VERSION = 'v1.7.9';

const { GsplatRevealRadial } = await fileImport(`${rootPath}/static/scripts/esm/gsplat/reveal-radial.mjs`);
const { GsplatRevealRain } = await fileImport(`${rootPath}/static/scripts/esm/gsplat/reveal-rain.mjs`);
const { GsplatRevealGridEruption } = await fileImport(`${rootPath}/static/scripts/esm/gsplat/reveal-grid-eruption.mjs`);
const { GsplatRevealInstant } = await fileImport(`${rootPath}/static/scripts/esm/gsplat/reveal-instant.mjs`);
const { GsplatRevealFade } = await fileImport(`${rootPath}/static/scripts/esm/gsplat/reveal-fade.mjs`);
const { GsplatRevealSpread } = await fileImport(`${rootPath}/static/scripts/esm/gsplat/reveal-spread.mjs`);
const { GsplatRevealUnroll } = await fileImport(`${rootPath}/static/scripts/esm/gsplat/reveal-unroll.mjs`);
const { GsplatRevealTwister } = await fileImport(`${rootPath}/static/scripts/esm/gsplat/reveal-twister.mjs`);
const { GsplatRevealMagic } = await fileImport(`${rootPath}/static/scripts/esm/gsplat/reveal-magic.mjs`);
const { GsplatBoxShaderEffect } = await fileImport(`${rootPath}/static/scripts/esm/gsplat/shader-effect-box.mjs`);

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('application-canvas'));
window.focus();


const gfxOptions = {
    deviceTypes: [deviceType],

    // disable antialiasing as gaussian splats do not benefit from it and it's expensive
    antialias: false
};

const device = await pc.createGraphicsDevice(canvas, gfxOptions);
device.maxPixelRatio = Math.min(window.devicePixelRatio, 2);

const createOptions = new pc.AppOptions();
createOptions.graphicsDevice = device;
createOptions.mouse = new pc.Mouse(document.body);
createOptions.touch = new pc.TouchDevice(document.body);

createOptions.componentSystems = [
    pc.RenderComponentSystem,
    pc.CameraComponentSystem,
    pc.LightComponentSystem,
    pc.ScriptComponentSystem,
    pc.GSplatComponentSystem
];
createOptions.resourceHandlers = [pc.TextureHandler, pc.ContainerHandler, pc.ScriptHandler, pc.GSplatHandler];

const app = new pc.AppBase(canvas);
app.init(createOptions);

// Set the canvas to fill the window and automatically change resolution to be the same as the canvas size
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);

// Ensure canvas is resized when window changes size
const resize = () => app.resizeCanvas();
window.addEventListener('resize', resize);
app.on('destroy', () => {
    window.removeEventListener('resize', resize);
});

// Fetch scenes from API dynamically instead of using hardcoded list
let availableScenes = []; // Will be populated from API
let sceneInfoMap = new Map(); // Maps sceneId -> {id, name, url, filename}
const assets = {}; // Assets will be created dynamically

// Fetch scenes from API
async function fetchScenesFromAPI() {
    try {
        console.log(`[Build ${BUILD_VERSION}] Fetching scenes from API...`);
        const response = await fetch('/api/scenes');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const apiResponse = await response.json();
        const apiScenes = apiResponse.scenes || (Array.isArray(apiResponse) ? apiResponse : []);
        
        if (!Array.isArray(apiScenes) || apiScenes.length === 0) {
            throw new Error('API returned empty or invalid scenes array');
        }
        
        // Build scene info map and available scenes array
        availableScenes = apiScenes;
        sceneInfoMap.clear();
        apiScenes.forEach(scene => {
            if (scene && scene.id && scene.name && scene.url) {
                sceneInfoMap.set(scene.id, {
                    id: scene.id,
                    name: scene.name,
                    url: scene.url,
                    filename: scene.filename || ''
                });
            }
        });
        
        // Format for observer (used by controls)
        const scenesForObserver = apiScenes.map(s => ({ name: s.name, id: s.id }));
        data.set('availableScenes', scenesForObserver);
        
        console.log(`[Build ${BUILD_VERSION}] Loaded ${availableScenes.length} scenes from API:`, availableScenes.map(s => s.name));
        return true;
    } catch (error) {
        console.error(`[Build ${BUILD_VERSION}] Failed to fetch scenes from API:`, error);
        // Fallback to hardcoded scenes if API fails
        console.warn(`[Build ${BUILD_VERSION}] Falling back to hardcoded scene configuration`);
        availableScenes = AVAILABLE_SCENES;
        const scenesForObserver = getScenesForObserver();
        data.set('availableScenes', scenesForObserver);
        // Build scene info map from hardcoded scenes
        availableScenes.forEach(scene => {
            sceneInfoMap.set(scene.id, {
                id: scene.id,
                name: scene.name,
                url: `${rootPath}/static/assets/splats/${scene.plyFile}`,
                filename: scene.plyFile
            });
        });
        return false;
    }
}

// Wait for API scenes to load before initializing
await fetchScenesFromAPI();

// Create initial assets for scenes that exist in hardcoded config (for backward compatibility)
const initialAssets = createSceneAssets(rootPath);
Object.assign(assets, initialAssets);

// Store pending scene changes until changeToScene is defined
const pendingSceneChanges = [];

// Register changeScene handler BEFORE loading assets to ensure it's ready when events fire
// Handle scene change to specific scene
data.on('changeScene', (sceneId) => {
    if (typeof sceneId === 'string') {
        // Try to process immediately if function is already defined
        if (typeof window._changeToScene === 'function') {
            // changeToScene will handle transitionStarted flag internally
            window._changeToScene(sceneId);
        } else {
            // changeToScene not ready yet, store in pending
            // Only add if not already in pending (avoid duplicates)
            if (pendingSceneChanges.indexOf(sceneId) === -1) {
                pendingSceneChanges.push(sceneId);
            }
        }
    } else {
        console.error(`[Build ${BUILD_VERSION}] ❌ Invalid sceneId type: ${typeof sceneId}, expected string`);
    }
});

const assetListLoader = new pc.AssetListLoader(Object.values(assets), app.assets);
assetListLoader.load(() => {
    app.start();

    // Load saved settings IMMEDIATELY (before creating script)
    // This ensures script is created with correct settings from the start

    // Array of available effects
    const effects = ['radial', 'rain', 'grid', 'instant', 'fade', 'spread', 'unroll', 'twister', 'magic'];

    // Default to radial effect (or load from localStorage)
    const savedEffect = localStorage.getItem('revealEffect') || 'radial';
    data.set('effect', savedEffect);

    // Load saved settings IMMEDIATELY (before creating script)
    // This ensures script is created with correct settings from the start
    let savedSettings = null;
    let settingsLoaded = false;
    savedSettings = loadSettings(data);
    if (savedSettings) {
        console.log('✅ Loaded settings from localStorage:', savedSettings);
        // Apply saved settings - they should override defaults
        Object.keys(savedSettings).forEach(key => {
            // Always apply saved settings to override defaults
            data.set(key, savedSettings[key]);
        });
        settingsLoaded = true;
        console.log('✅ Settings applied to observer, speed:', data.get('speed'));
    } else {
        console.log('ℹ️ No saved settings found in localStorage');
    }
    
    // Also set up delayed loading as fallback (in case controls override values)
    let applyLoadedSettings = null; // Will be defined after syncSettingsToScript
    setTimeout(() => {
        // Re-apply saved settings if they were loaded (to override any defaults set by controls)
        if (savedSettings) {
            console.log('🔄 Re-applying saved settings after controls init (150ms delay)...');
            const beforeSpeed = data.get('speed');
            Object.keys(savedSettings).forEach(key => {
                data.set(key, savedSettings[key]);
            });
            const afterSpeed = data.get('speed');
            console.log(`   Speed before: ${beforeSpeed}, after: ${afterSpeed}, expected: ${savedSettings.speed}`);
            
            // Apply to script if it's already created
            if (applyLoadedSettings) {
                applyLoadedSettings();
            }
        }
    }, 150); // After controls have initialized

    // Initialize auto-save functionality
    initializeAutoSave(data, savedSettings);

    // Current scene tracking - use first available scene or 'future' as fallback
    let currentSceneId = 'future'; // Default, will be updated if API provides scenes
    if (availableScenes.length > 0) {
        currentSceneId = availableScenes[0].id;
        console.log(`[Build ${BUILD_VERSION}] Using first scene from API as initial scene: ${currentSceneId}`);
    }
    
    // Store scene entities by their ID
    const sceneEntities = {};
    
    // Variables for scene transition (declare early to avoid "before initialization" errors)
    let scene1 = null;
    let scene1Script = null;
    let transitionStarted = false;
    let currentActiveScene = null; // Track which scene is currently active
    let nextScene = null; // Track which scene will be shown next (will be set during transition)
    
    /**
     * Create or get asset for a scene, creating it dynamically if needed
     * @param {string} sceneId - The scene ID
     * @returns {pc.Asset|null} The asset, or null if scene not found
     */
    const getOrCreateAsset = (sceneId) => {
        // Check if asset already exists
        if (assets[sceneId]) {
            return assets[sceneId];
        }
        
        // Get scene info from map
        const sceneInfo = sceneInfoMap.get(sceneId);
        if (!sceneInfo) {
            console.error(`[Build ${BUILD_VERSION}] Scene with id "${sceneId}" not found in scene info map`);
            console.error(`[Build ${BUILD_VERSION}] Available scene IDs:`, Array.from(sceneInfoMap.keys()));
            return null;
        }
        
        // Create asset dynamically using URL from API
        console.log(`[Build ${BUILD_VERSION}] Creating asset dynamically for scene "${sceneId}" (${sceneInfo.name}) with URL: ${sceneInfo.url}`);
        
        // Verify URL is valid before creating asset
        if (!sceneInfo.url || typeof sceneInfo.url !== 'string') {
            console.error(`[Build ${BUILD_VERSION}] ❌ Invalid URL for scene "${sceneId}": ${sceneInfo.url}`);
            return null;
        }
        
        const asset = new pc.Asset(`gsplat-${sceneId}`, 'gsplat', { 
            url: sceneInfo.url 
        });
        
        // Register asset
        assets[sceneId] = asset;
        app.assets.add(asset);
        
        
        return asset;
    };
    
    /**
     * Create a scene entity for the given scene ID
     * @param {string} sceneId - The scene ID
     * @returns {pc.Entity|null} The created entity, or null if failed
     */
    const createSceneEntity = (sceneId) => {
        // Get scene info for validation
        const sceneInfo = sceneInfoMap.get(sceneId);
        if (!sceneInfo) {
            const errorMsg = `[Build ${BUILD_VERSION}] ❌ Scene with id "${sceneId}" not found`;
            console.error(errorMsg);
            console.error(`[Build ${BUILD_VERSION}] Available scene IDs:`, Array.from(sceneInfoMap.keys()));
            data.emit('sceneLoadError', {
                sceneId,
                error: 'Scene not found',
                availableScenes: Array.from(sceneInfoMap.keys())
            });
            return null;
        }
        
        // Get or create asset
        const asset = getOrCreateAsset(sceneId);
        if (!asset) {
            const errorMsg = `[Build ${BUILD_VERSION}] ❌ Failed to create asset for scene "${sceneId}"`;
            console.error(errorMsg);
            data.emit('sceneLoadError', {
                sceneId,
                sceneName: sceneInfo.name,
                url: sceneInfo.url,
                error: 'Asset creation failed'
            });
            return null;
        }
        
        // Check if asset is loaded
        
        // If asset is not loaded, wait for it to load before creating entity
        if (!asset.resource) {
            // Try to load asset if not already loading
            if (!asset.loading && !asset.loaded) {
                // Add error handler before loading
                let loadError = null;
                asset.once('error', (error, asset) => {
                    loadError = error;
                    console.error(`[Build ${BUILD_VERSION}] ❌ Asset load error for scene "${sceneId}" from URL "${asset?.file?.url}":`, error);
                    data.emit('sceneLoadError', {
                        sceneId,
                        sceneName: sceneInfo.name,
                        url: asset?.file?.url || sceneInfo.url,
                        error: `Asset load failed: ${error?.message || error}`,
                        stack: error?.stack
                    });
                });
                app.assets.load(asset);
                
                // Wait for asset to load or error
                return new Promise((resolve) => {
                    const onLoad = () => {
                        if (loadError) {
                            // Asset failed to load, don't create entity
                            resolve(null);
                            return;
                        }
                        // Asset loaded successfully, create entity
                        try {
                            const entity = createEntityWithAsset(sceneId, asset, sceneInfo);
                            resolve(entity);
                        } catch (error) {
                            console.error(`[Build ${BUILD_VERSION}] ❌ Failed to create entity after asset load:`, error);
                            resolve(null);
                        }
                    };
                    
                    if (asset.loaded) {
                        onLoad();
                    } else {
                        asset.once('load', onLoad);
                        // Also handle case where error was already fired
                        if (loadError) {
                            resolve(null);
                        }
                    }
                });
            } else if (asset.loading) {
                // Asset is already loading, wait for it
                return new Promise((resolve) => {
                    let loadError = null;
                    asset.once('error', (error) => {
                        loadError = error;
                        resolve(null);
                    });
                    asset.once('load', () => {
                        if (loadError) {
                            resolve(null);
                            return;
                        }
                        try {
                            const entity = createEntityWithAsset(sceneId, asset, sceneInfo);
                            resolve(entity);
                        } catch (error) {
                            console.error(`[Build ${BUILD_VERSION}] ❌ Failed to create entity after asset load:`, error);
                            resolve(null);
                        }
                    });
                });
            } else {
                // Asset failed to load previously
                console.warn(`[Build ${BUILD_VERSION}] ⚠️ Asset for scene "${sceneId}" failed to load previously, skipping entity creation`);
                return null;
            }
        }
        
        // Asset is loaded, create entity
        return createEntityWithAsset(sceneId, asset, sceneInfo);
    };
    
    /**
     * Helper function to create entity with asset (assumes asset.resource exists)
     */
    const createEntityWithAsset = (sceneId, asset, sceneInfo) => {
        
        // Verify asset has resource before creating entity
        if (!asset.resource) {
            console.error(`[Build ${BUILD_VERSION}] ❌ Cannot create entity: asset for scene "${sceneId}" has no resource`);
            return null;
        }
        
        try {
            const entity = new pc.Entity(`scene-${sceneId}`);
            // Disable entity BEFORE adding to root to prevent any rendering before it's ready
            entity.enabled = false;
            entity.addComponent('gsplat', {
                asset: asset,
                unified: true
            });

            // Prevent frustum culling from clipping the splat when the camera is very far away
            // by assigning an oversized bounding box. This keeps the splat visible at long zoom distances.
            const hugeExtent = 5000;
            entity.gsplat.customAabb = new pc.BoundingBox(new pc.Vec3(0, 0, 0), new pc.Vec3(hugeExtent, hugeExtent, hugeExtent));
            entity.setLocalEulerAngles(180, 0, 0);
            entity.addComponent('script');
            app.root.addChild(entity);
            
            console.log(`[Build ${BUILD_VERSION}] ✅ Created scene entity for "${sceneId}" (${sceneInfo.name})`);
            return entity;
        } catch (error) {
            const errorMsg = `[Build ${BUILD_VERSION}] ❌ Failed to create entity for scene "${sceneId}": ${error.message}`;
            console.error(errorMsg, error);
            data.emit('sceneLoadError', {
                sceneId,
                sceneName: sceneInfo.name,
                url: sceneInfo.url,
                error: error.message,
                stack: error.stack
            });
            return null;
        }
    };
    
    // Create initial scene (will be enabled)
    // Note: createSceneEntity may return a Promise if asset needs to load
    // scene1 is already declared above
    const scene1Result = createSceneEntity(currentSceneId);
    const handleScene1 = (sceneEntity) => {
        if (!sceneEntity) {
            console.error(`[Build ${BUILD_VERSION}] ❌ Failed to create initial scene "${currentSceneId}"`);
            // Try to fall back to any available scene
            if (availableScenes.length > 1) {
                const fallbackId = availableScenes[1].id;
                console.warn(`[Build ${BUILD_VERSION}] Attempting fallback to scene: ${fallbackId}`);
                const fallbackResult = createSceneEntity(fallbackId);
                const handleFallback = (fallbackScene) => {
                    if (fallbackScene) {
                        currentSceneId = fallbackId;
                        fallbackScene.enabled = false; // Keep disabled - black screen until "Reveal Scene" is clicked
                        sceneEntities[currentSceneId] = fallbackScene;
                        scene1 = fallbackScene; // Update scene1 reference
                        currentActiveScene = fallbackScene;
                        console.log(`[Build ${BUILD_VERSION}] ✅ Fallback scene "${currentSceneId}" created (disabled - black screen until "Reveal Scene" is clicked)`);
                    }
                };
                if (fallbackResult instanceof Promise) {
                    fallbackResult.then(handleFallback);
                } else {
                    handleFallback(fallbackResult);
                }
            }
        } else {
            // Don't enable initial scene - show black screen until user clicks "Reveal Scene"
            sceneEntity.enabled = false; // Keep scene disabled initially
            sceneEntities[currentSceneId] = sceneEntity;
            scene1 = sceneEntity; // Update scene1 reference
            // Update currentActiveScene
            currentActiveScene = sceneEntity;
            console.log(`[Build ${BUILD_VERSION}] ✅ Initial scene "${currentSceneId}" created (disabled - black screen until "Reveal Scene" is clicked)`);
        }
    };
    // Update scene1 reference when Promise resolves
    if (scene1Result instanceof Promise) {
        scene1Result.then((result) => {
            scene1 = result;
            handleScene1(result);
            // Update currentActiveScene
            if (scene1) {
                currentActiveScene = scene1;
            }
            // REMOVED: Automatic script creation - now triggered by "Reveal Scene" button
            // Script will be created when user clicks "Reveal Scene" button
        });
    } else {
        scene1 = scene1Result;
        handleScene1(scene1Result);
        // Update currentActiveScene
        if (scene1) {
            currentActiveScene = scene1;
        }
    }

    // Helper vector for calculations
    const tmpVec3 = new pc.Vec3();

    // Note: scene1, scene1Script, transitionStarted, currentActiveScene, nextScene are already declared above
    
    // Function to change to a specific scene
    const changeToScene = (targetSceneId) => {
        
        // If transition is in progress, cancel it and start new transition with target scene
        if (transitionStarted) {
            console.log(`[Build ${BUILD_VERSION}] ⚠️ Transition in progress, canceling and switching to "${targetSceneId}"`);
            
            // Cancel current transition timeout if exists
            if (window._sceneTransitionTimeout) {
                clearTimeout(window._sceneTransitionTimeout);
                window._sceneTransitionTimeout = null;
            }
            
            // Disable nextScene if it exists (the one that was being transitioned to)
            if (nextScene && nextScene !== currentActiveScene) {
                nextScene.enabled = false;
                // Clean up scripts from nextScene
                if (nextScene.script) {
                    nextScene.script?.destroy(GsplatRevealRadial.scriptName);
                    nextScene.script?.destroy(GsplatRevealRain.scriptName);
                    nextScene.script?.destroy(GsplatRevealGridEruption.scriptName);
                    nextScene.script?.destroy(GsplatRevealInstant.scriptName);
                    nextScene.script?.destroy(GsplatRevealFade.scriptName);
                    nextScene.script?.destroy(GsplatRevealSpread.scriptName);
                    nextScene.script?.destroy(GsplatRevealUnroll.scriptName);
                    nextScene.script?.destroy(GsplatRevealTwister.scriptName);
                    nextScene.script?.destroy(GsplatRevealMagic.scriptName);
                }
            }
            
            // Disable ALL scenes to ensure clean state
            Object.values(sceneEntities).forEach((sceneEntity) => {
                if (sceneEntity && sceneEntity.enabled) {
                    sceneEntity.enabled = false;
                }
            });
            
            // Reset transition flag to allow new transition
            transitionStarted = false;
        }
        
        // Set transition flag IMMEDIATELY to prevent other calls from proceeding
        transitionStarted = true;
        
        // Check if we're already on this scene
        // Use a more robust check: compare with both currentSceneId and currentActiveScene
        const isAlreadyOnScene = targetSceneId === currentSceneId || 
            (currentActiveScene && sceneEntities[targetSceneId] === currentActiveScene);
        
        if (isAlreadyOnScene) {
            console.log(`[Build ${BUILD_VERSION}] ℹ️ Already on scene "${targetSceneId}"`);
            transitionStarted = false; // Reset flag since we're not actually changing
            return;
        }
        
        // Validate scene exists
        const sceneInfo = sceneInfoMap.get(targetSceneId);
        if (!sceneInfo) {
            const errorMsg = `[Build ${BUILD_VERSION}] ❌ Scene change failed: Scene "${targetSceneId}" not found`;
            console.error(errorMsg);
            console.error(`[Build ${BUILD_VERSION}] Available scene IDs:`, Array.from(sceneInfoMap.keys()));
            data.emit('sceneLoadError', {
                sceneId: targetSceneId,
                error: 'Scene not found in scene info map',
                availableScenes: Array.from(sceneInfoMap.keys())
            });
            transitionStarted = false; // Reset flag on error
            return;
        }
        
        console.log(`[Build ${BUILD_VERSION}] 🎬 Changing to scene "${targetSceneId}" (${sceneInfo.name})`);
        
        // Get or create asset and ensure it's loaded
        const asset = getOrCreateAsset(targetSceneId);
        if (!asset) {
            const errorMsg = `[Build ${BUILD_VERSION}] ❌ Scene change failed: Could not get/create asset for "${targetSceneId}"`;
            console.error(errorMsg);
            data.emit('sceneLoadError', {
                sceneId: targetSceneId,
                sceneName: sceneInfo.name,
                url: sceneInfo.url,
                error: 'Asset creation/retrieval failed'
            });
            transitionStarted = false; // Reset flag on error
            return;
        }
        
        // Load asset if not already loaded
        if (!asset.resource) {
            console.log(`[Build ${BUILD_VERSION}] ⏳ Asset for "${targetSceneId}" not loaded, loading now from URL: ${asset.file?.url}`);
            const onAssetReady = () => {
                console.log(`[Build ${BUILD_VERSION}] ✅ Asset for "${targetSceneId}" loaded successfully`);
                // Retry scene change after asset loads
                changeToScene(targetSceneId);
            };
            const onAssetError = (error, asset) => {
                const errorMsg = `[Build ${BUILD_VERSION}] ❌ Failed to load asset for "${targetSceneId}" from URL "${asset?.file?.url}": ${error?.message || error}`;
                console.error(errorMsg, error);
                data.emit('sceneLoadError', {
                    sceneId: targetSceneId,
                    sceneName: sceneInfo.name,
                    url: asset?.file?.url || sceneInfo.url,
                    error: `Asset load failed: ${error?.message || error}`,
                    httpStatus: error?.status || 'unknown',
                    stack: error?.stack
                });
            };
            asset.ready(onAssetReady);
            asset.once('error', onAssetError);
            app.assets.load(asset);
            // NOTE: transitionStarted flag is already set, so other calls will be blocked
            // Flag will be reset when asset loads and changeToScene is called again
            return; // Will retry after asset loads or error
        }
        
        // Find or create the target scene entity
        let targetScene = sceneEntities[targetSceneId];
        if (!targetScene) {
            const entityResult = createSceneEntity(targetSceneId);
            const handleEntityResult = (entity) => {
                if (!entity) {
                    const errorMsg = `[Build ${BUILD_VERSION}] ❌ Scene change failed: Could not create entity for "${targetSceneId}"`;
                    console.error(errorMsg);
                    data.emit('sceneLoadError', {
                        sceneId: targetSceneId,
                        sceneName: sceneInfo.name,
                        url: sceneInfo.url,
                        error: 'Entity creation failed'
                    });
                    // Reset transition flag on error
                    transitionStarted = false;
                    return;
                }
                entity.renderOrder = 1;
                entity.enabled = false;
                sceneEntities[targetSceneId] = entity;
                console.log(`[Build ${BUILD_VERSION}] ✅ Scene entity created for "${targetSceneId}"`);
                
                // Set next scene for transition
                nextScene = entity;
                
                // CRITICAL: Update currentSceneId and currentActiveScene IMMEDIATELY after entity creation
                // This ensures that if user clicks "Reveal Scene" during transition, the correct scene is used
                const oldCurrentSceneId = currentSceneId;
                const oldCurrentActiveScene = currentActiveScene;
                currentSceneId = targetSceneId;
                currentActiveScene = entity;
                
                // Start transition
                startSceneTransition();
            };
            
            if (entityResult instanceof Promise) {
                entityResult.then(handleEntityResult).catch((error) => {
                    console.error(`[Build ${BUILD_VERSION}] ❌ Error creating scene entity:`, error);
                    transitionStarted = false;
                });
                return; // Will continue in promise handler
            } else {
                handleEntityResult(entityResult);
                return;
            }
        } else {
        }
        
        // Set next scene for transition
        nextScene = targetScene;
        
        // Start transition
        startSceneTransition();
    };
    
    // Expose changeToScene globally so it can be called from early event handlers
    window._changeToScene = changeToScene;
    
    
    // Process any pending scene changes - process them sequentially, but only the last one if multiple
    if (pendingSceneChanges.length > 0) {
        // If multiple changes are pending, only process the LAST one (user's final selection)
        // This prevents loading intermediate scenes when user quickly changes selection
        const lastSceneId = pendingSceneChanges[pendingSceneChanges.length - 1];
        pendingSceneChanges.length = 0; // Clear all pending changes
        
        // Only process if it's different from current scene
        if (lastSceneId && lastSceneId !== currentSceneId) {
            changeToScene(lastSceneId);
        } else if (lastSceneId === currentSceneId) {
        }
    }

    // Get current active script
    const getActiveScript = () => {
        const currentEffect = data.get('effect');
        if (!currentActiveScene || !currentActiveScene.script) return null;
        
        if (currentEffect === 'radial') {
            return currentActiveScene.script.get(GsplatRevealRadial.scriptName);
        } else if (currentEffect === 'rain') {
            return currentActiveScene.script.get(GsplatRevealRain.scriptName);
        } else if (currentEffect === 'grid') {
            return currentActiveScene.script.get(GsplatRevealGridEruption.scriptName);
        } else if (currentEffect === 'instant') {
            return currentActiveScene.script.get(GsplatRevealInstant.scriptName);
        } else if (currentEffect === 'fade') {
            return currentActiveScene.script.get(GsplatRevealFade.scriptName);
        } else if (currentEffect === 'spread') {
            return currentActiveScene.script.get(GsplatRevealSpread.scriptName);
        } else if (currentEffect === 'unroll') {
            return currentActiveScene.script.get(GsplatRevealUnroll.scriptName);
        } else if (currentEffect === 'twister') {
            return currentActiveScene.script.get(GsplatRevealTwister.scriptName);
        } else if (currentEffect === 'magic') {
            return currentActiveScene.script.get(GsplatRevealMagic.scriptName);
        }
        return null;
    };

    // Sync observer settings to active script in real-time
    const syncSettingsToScript = () => {
        const currentEffect = data.get('effect');
        if (currentEffect === 'radial') {
            const script = currentActiveScene.script?.get(GsplatRevealRadial.scriptName);
            if (script) {
                applySettingsToRadialScript(data, script);
            }
        } else if (currentEffect === 'rain') {
            const script = currentActiveScene.script?.get(GsplatRevealRain.scriptName);
            if (script) {
                applySettingsToRainScript(data, script);
            }
        } else if (currentEffect === 'grid') {
            const script = currentActiveScene.script?.get(GsplatRevealGridEruption.scriptName);
            if (script) {
                applySettingsToGridScript(data, script);
            }
        } else if (currentEffect === 'fade') {
            const script = currentActiveScene.script?.get(GsplatRevealFade.scriptName);
            if (script) {
                applySettingsToFadeScript(data, script);
            }
        } else if (currentEffect === 'spread') {
            const script = currentActiveScene.script?.get(GsplatRevealSpread.scriptName);
            if (script) {
                applySettingsToSpreadScript(data, script);
            }
        } else if (currentEffect === 'unroll') {
            const script = currentActiveScene.script?.get(GsplatRevealUnroll.scriptName);
            if (script) {
                applySettingsToUnrollScript(data, script);
            }
        } else if (currentEffect === 'twister') {
            const script = currentActiveScene.script?.get(GsplatRevealTwister.scriptName);
            if (script) {
                applySettingsToTwisterScript(data, script);
            }
        } else if (currentEffect === 'magic') {
            const script = currentActiveScene.script?.get(GsplatRevealMagic.scriptName);
            if (script) {
                applySettingsToMagicScript(data, script);
            }
        }
    };

    // Define function to apply loaded settings (after syncSettingsToScript is defined)
    applyLoadedSettings = () => {
        if (settingsLoaded && currentActiveScene) {
            // Only apply settings if script already exists (reveal was started by user)
            // DO NOT create script automatically - wait for user to click "Reveal Scene"
            if (scene1Script) {
                // Script exists, just sync settings to it
                syncSettingsToScript();
            } else {
                // Script doesn't exist yet - don't create it automatically
                // User must click "Reveal Scene" button first
            }
        }
    };

    // Listen to all setting changes and sync to active script (only after script is created)
    let scriptReady = false;
    setTimeout(() => {
        scriptReady = true;
        SETTINGS_KEYS.forEach(key => {
            data.on(`${key}:set`, () => {
                if (scriptReady) {
                    syncSettingsToScript();
                }
            });
        });
    }, 300);

    // REMOVED: Automatic script creation - now triggered by "Reveal Scene" button
    // Script will be created when user clicks "Reveal Scene" button
    
    // Handle reveal scene button - start reveal animation
    data.on('revealScene', () => {
        const currentEffect = data.get('effect') || 'radial';
        
        // CRITICAL: Determine target scene based on transition state
        // Priority: 1) nextScene if transition in progress, 2) sceneEntities[currentSceneId], 3) currentActiveScene, 4) scene1
        let targetScene = null;
        
        if (transitionStarted && nextScene) {
            // Transition in progress - use nextScene (the new scene being transitioned to)
            targetScene = nextScene;
        } else {
            // No transition in progress - use currentSceneId
            targetScene = sceneEntities[currentSceneId];
        }
        
        // Fallback to currentActiveScene or scene1 if still not found
        if (!targetScene) {
            targetScene = currentActiveScene || scene1 || null;
        }
        
        
        if (!targetScene) {
            console.warn(`[Build ${BUILD_VERSION}] ⚠️ Cannot start reveal: no active scene for "${currentSceneId}"`);
            return;
        }
        
        // Update currentActiveScene to ensure it points to the correct scene
        if (currentActiveScene !== targetScene) {
            currentActiveScene = targetScene;
        }
        
        console.log(`[Build ${BUILD_VERSION}] 🎬 Starting reveal animation for scene "${currentSceneId}" (${targetScene.name}) with effect "${currentEffect}"`);
        
        // CRITICAL: Disable ALL other scenes BEFORE enabling target scene
        // This prevents the previous scene from being visible for a moment
        
        Object.values(sceneEntities).forEach((sceneEntity) => {
            if (sceneEntity && sceneEntity !== targetScene) {
                const wasEnabled = sceneEntity.enabled;
                sceneEntity.enabled = false;
                if (wasEnabled) {
                }
            }
        });
        
        // Enable the scene first (it was disabled to show black screen)
        if (!targetScene.enabled) {
            targetScene.enabled = true;
        }
        
        // Create the reveal effect script
        scene1Script = createEffect(data, currentEffect, targetScene, GsplatRevealRadial, GsplatRevealRain, GsplatRevealGridEruption, GsplatRevealInstant, GsplatRevealFade, GsplatRevealSpread, GsplatRevealUnroll, GsplatRevealTwister, GsplatRevealMagic);
        
        // Apply saved settings if available (only for radial effect)
        if (scene1Script && savedSettings && currentEffect === 'radial') {
            const expectedSpeed = savedSettings.speed;
            const currentSpeed = scene1Script.speed;
            const observerSpeed = data.get('speed');
            
            console.log('=== REVEAL STARTED - SETTINGS VERIFICATION ===');
            console.log('Script speed after creation:', currentSpeed);
            console.log('Observer speed:', observerSpeed);
            console.log('Saved speed from localStorage:', expectedSpeed);
            
            // Re-apply saved settings to ensure they are correct
            if (expectedSpeed !== undefined) {
                console.log('Re-applying ALL saved settings to ensure correctness...');
                
                // First, ensure observer has correct values
                Object.keys(savedSettings).forEach(key => {
                    data.set(key, savedSettings[key]);
                });
                
                // Then force apply to script with ALL settings
                applySettingsToRadialScript(data, scene1Script, true);
                
                // Verify it worked
                const newSpeed = scene1Script.speed;
                console.log('After re-apply, script speed:', newSpeed);
                
                // If still mismatched, recreate script
                if (Math.abs(newSpeed - expectedSpeed) > 0.001) {
                    console.warn('⚠️ Speed still mismatched after re-apply. Recreating script...');
                    const currentScene = scene1 || (sceneEntities[currentSceneId] || currentActiveScene);
                    if (currentScene) {
                        scene1Script = createEffect(data, currentEffect, currentScene, GsplatRevealRadial, GsplatRevealRain, GsplatRevealGridEruption, GsplatRevealInstant, GsplatRevealFade, GsplatRevealSpread, GsplatRevealUnroll, GsplatRevealTwister, GsplatRevealMagic);
                    }
                    const finalSpeed = scene1Script?.speed;
                    console.log('Script recreated, final speed:', finalSpeed);
                    if (Math.abs(finalSpeed - expectedSpeed) > 0.001) {
                        console.error('❌ CRITICAL: Speed still wrong after recreation!', {
                            expected: expectedSpeed,
                            actual: finalSpeed,
                            observer: data.get('speed')
                        });
                    } else {
                        console.log('✅ Speed correct after recreation');
                    }
                } else {
                    console.log('✅ Speed matches after re-apply');
                }
            }
            console.log('===============================================');
        } else if (scene1Script) {
            console.log('ℹ️ Reveal started, no saved settings to verify');
        }
    });

    // Switch between effects when dropdown changes
    // Only recreate effect if script already exists (i.e., reveal was started)
    data.on('effect:set', () => {
        const effect = data.get('effect');
        // Only create effect if reveal was already started (script exists)
        if (scene1Script && currentActiveScene) {
            scene1Script = createEffect(data, effect, currentActiveScene, GsplatRevealRadial, GsplatRevealRain, GsplatRevealGridEruption, GsplatRevealInstant, GsplatRevealFade, GsplatRevealSpread, GsplatRevealUnroll, GsplatRevealTwister, GsplatRevealMagic);
        }
    });

    // Restart button - recreate current effect from beginning
    data.on('restart', () => {
        const currentEffect = data.get('effect');
        // Only restart if reveal was already started
        if (scene1Script && currentActiveScene) {
            scene1Script = createEffect(data, currentEffect, currentActiveScene, GsplatRevealRadial, GsplatRevealRain, GsplatRevealGridEruption, GsplatRevealInstant, GsplatRevealFade, GsplatRevealSpread, GsplatRevealUnroll, GsplatRevealTwister, GsplatRevealMagic);
        }
    });

    // Prev button - cycle to previous effect in the list
    data.on('prev', () => {
        const currentEffect = data.get('effect');
        const currentIndex = effects.indexOf(currentEffect);
        const prevIndex = (currentIndex - 1 + effects.length) % effects.length;
        const prevEffect = effects[prevIndex];
        data.set('effect', prevEffect);
    });

    // Next button - cycle to next effect in the list
    data.on('next', () => {
        const currentEffect = data.get('effect');
        const currentIndex = effects.indexOf(currentEffect);
        const nextIndex = (currentIndex + 1) % effects.length;
        const nextEffect = effects[nextIndex];
        data.set('effect', nextEffect);
    });

    // Handle camera pause toggle
    data.on('cameraPause', (paused) => {
        cameraPaused = paused;
    });

    // Create an Entity with a camera component
    const camera = new pc.Entity();
    camera.addComponent('camera', {
        clearColor: pc.Color.BLACK,
        fov: 80,
        toneMapping: pc.TONEMAP_ACES,
        nearClip: 0.05,
        farClip: 100000
    });
    camera.setLocalPosition(3, 1, 0.5);

    // add orbit camera script with a mouse and a touch support
    camera.addComponent('script');
    const orbitCameraScript = camera.script?.create('orbitCamera', {
        attributes: {
            inertiaFactor: 0.2,
            focusEntity: currentActiveScene,
            distanceMax: 0,
            frameOnStart: false
        }
    });
    camera.script?.create('orbitCameraInputMouse');
    camera.script?.create('orbitCameraInputTouch');
    app.root.addChild(camera);

    // Auto-rotate camera when idle
    let autoRotateEnabled = true;
    let cameraPaused = true; // Camera paused by default
    let lastInteractionTime = 0;
    const autoRotateDelay = 2; // seconds of inactivity before auto-rotate resumes
    const autoRotateSpeed = 10; // degrees per second

    // Detect user interaction (click/touch only, not mouse movement)
    const onUserInteraction = () => {
        autoRotateEnabled = false;
        lastInteractionTime = Date.now();
    };

    // Listen for click and touch events only
    if (app.mouse) {
        app.mouse.on('mousedown', onUserInteraction);
        app.mouse.on('mousewheel', onUserInteraction);
    }
    if (app.touch) {
        app.touch.on('touchstart', onUserInteraction);
    }

    /**
     * Start transition from current scene to next scene with reverse reveal animation
     * NOTE: transitionStarted flag is already set by changeToScene before calling this function
     */
    const startSceneTransition = () => {
        
        // NOTE: transitionStarted is already set by changeToScene, so we don't check it here
        // This function is only called from changeToScene, which already has the flag set

        // Validate entities exist
        if (!currentActiveScene || !nextScene) {
            console.error('Scene transition failed: missing scene entities', {
                currentActiveScene: !!currentActiveScene,
                nextScene: !!nextScene
            });
            transitionStarted = false; // Reset flag on validation failure
            return;
        }

        // Validate that scenes have script components
        if (!currentActiveScene.script) {
            console.error('Scene transition failed: currentActiveScene missing script component');
            transitionStarted = false; // Reset flag on validation failure
            return;
        }
        if (!nextScene.script) {
            console.error('Scene transition failed: nextScene missing script component');
            transitionStarted = false; // Reset flag on validation failure
            return;
        }

        // Check if reveal was started (script exists on current scene)
        // If reveal not started, we can still transition but without reverse animation
        const currentScript = getActiveScript();
        const hasRevealScript = currentScript || scene1Script;
        
        if (!hasRevealScript) {
            // No reveal script - transition immediately without reverse animation
            console.log(`[Build ${BUILD_VERSION}] ℹ️ Reveal animation not started, transitioning immediately without reverse animation`);
            
            // Disable current scene immediately
            if (currentActiveScene) {
                currentActiveScene.enabled = false;
            }
            
            // Disable ALL other scenes
            Object.values(sceneEntities).forEach((sceneEntity) => {
                if (sceneEntity && sceneEntity !== nextScene && sceneEntity.enabled) {
                    sceneEntity.enabled = false;
                }
            });
            
            // Set render order
            if (currentActiveScene) {
                currentActiveScene.renderOrder = 0;
            }
            if (nextScene) {
                nextScene.renderOrder = 1;
                nextScene.enabled = false; // Keep disabled until user clicks "Reveal Scene"
            }
            
            // Complete transition immediately
            const oldCurrent = currentActiveScene;
            const oldCurrentSceneId = currentSceneId;
            currentActiveScene = nextScene;
            
            // Find the new scene ID
            const newSceneId = availableScenes.find(s => 
                sceneEntities[s.id] === currentActiveScene
            )?.id || currentSceneId;
            currentSceneId = newSceneId;
            
            // Update nextScene reference
            nextScene = oldCurrent;
            
            // Clean up old scene scripts
            if (nextScene && nextScene.script) {
                nextScene.script?.destroy(GsplatRevealRadial.scriptName);
                nextScene.script?.destroy(GsplatRevealRain.scriptName);
                nextScene.script?.destroy(GsplatRevealGridEruption.scriptName);
                nextScene.script?.destroy(GsplatRevealInstant.scriptName);
                nextScene.script?.destroy(GsplatRevealFade.scriptName);
                nextScene.script?.destroy(GsplatRevealSpread.scriptName);
                nextScene.script?.destroy(GsplatRevealUnroll.scriptName);
                nextScene.script?.destroy(GsplatRevealTwister.scriptName);
                nextScene.script?.destroy(GsplatRevealMagic.scriptName);
                nextScene.renderOrder = 1;
            }
            
            // Clear script references
            scene1Script = null;
            
            // Update camera focus
            if (orbitCameraScript) {
                orbitCameraScript.focusEntity = currentActiveScene;
            }
            
            // Emit event to update UI
            data.emit('sceneChanged', currentSceneId);
            
            // Reset transition flag
            transitionStarted = false;
            
            return; // Transition complete, exit early
        }

        // Flag is already set by changeToScene, no need to set it again

        try {
            // Fixed transition parameters (no longer configurable)
            const currentReverseSpeed = 5.0;
            const currentOverlap = 0.5;

            // Get current active script to determine endRadius
            const currentScript = currentActiveScene.script?.get(GsplatRevealRadial.scriptName);
            
            // Calculate reverse animation duration
            // Time to hide current scene: (endRadius - revealStartRadius) / reverseSpeed
            // Use actual script values or reasonable defaults
            // Note: Use radius (current value) instead of endRadius (target value) for more accurate calculation
            const currentRadius = currentScript?.radius ?? (currentScript?.endRadius ?? 25);
            const revealStartRadius = currentScript?.revealStartRadius ?? 0.3;
            const reverseDistance = Math.max(0, currentRadius - revealStartRadius);
            
            
            // Prevent division by zero
            if (currentReverseSpeed <= 0) {
                console.error('reverseSpeed must be > 0, got:', currentReverseSpeed);
                transitionStarted = false;
                return;
            }
            
            const reverseDuration = reverseDistance / currentReverseSpeed;
            
            // Ensure reasonable duration: minimum 0.1s, maximum 10s
            // This prevents extremely long transitions that block further scene changes
            const minDuration = 0.1;
            const maxDuration = 10.0;
            const safeReverseDuration = Math.max(minDuration, Math.min(maxDuration, reverseDuration));
            

            // Calculate when to start next scene reveal based on overlap
            const nextSceneStartTime = safeReverseDuration * currentOverlap;

            // Note: currentSceneId and currentActiveScene are already updated in changeToScene
            // after entity creation, so we don't need to update them here again
            
            // Find the old scene for reverse animation and cleanup
            // The old scene should be the one that was currentActiveScene before we updated it in changeToScene
            // It should be disabled and have renderOrder 0
            const oldScene = Object.values(sceneEntities).find(s => 
                s && s !== currentActiveScene && s.enabled === false && s.renderOrder === 0
            );
            
            // Update nextScene to be the old scene (for cleanup later)
            if (oldScene) {
                nextScene = oldScene;
            }
            
            // Save oldCurrentSceneId for use in setTimeout callback
            const oldCurrentSceneIdForCleanup = currentSceneId; // This is actually the new scene ID now
            
            // Disable current active scene (the new one) - it should already be disabled, but ensure it
            if (currentActiveScene) {
                currentActiveScene.enabled = false;
            }
            
            // Disable ALL other scenes to ensure only currentActiveScene is active after transition
            Object.values(sceneEntities).forEach((sceneEntity) => {
                if (sceneEntity && sceneEntity !== currentActiveScene && sceneEntity.enabled) {
                    sceneEntity.enabled = false;
                }
            });
            
            // Start reverse reveal on OLD current scene
            // Find the scene that was active before (it should be disabled and have renderOrder 0)
            const sceneToReverse = Object.values(sceneEntities).find(s => 
                s && s !== currentActiveScene && s.enabled === false && s.renderOrder === 0
            );
            
            try {
                if (sceneToReverse && sceneToReverse.script) {
                    sceneToReverse.script?.destroy(GsplatRevealRadial.scriptName);
                    const reverseScript = createRadialScript(data, sceneToReverse, GsplatRevealRadial, true, currentReverseSpeed);
                if (!reverseScript) {
                    console.error('Failed to create reverse script');
                    transitionStarted = false;
                    return;
                }
                reverseScript.delay = 0; // Start immediately
                }
            } catch (error) {
                console.error('Error creating reverse script:', error);
                transitionStarted = false;
                return;
            }

            // Prepare next scene (which is now currentActiveScene) - DO NOT create reveal script automatically
            // User must click "Reveal Scene" button to start reveal animation
            try {
                // Set render order to ensure proper layering (higher = on top)
                if (nextScene) {
                    nextScene.renderOrder = 0;
                }
                currentActiveScene.renderOrder = 1;
                
                // DO NOT enable current scene - keep it disabled (black screen)
                // User must click "Reveal Scene" button to start reveal animation
                currentActiveScene.enabled = false;
            } catch (error) {
                console.error('Error preparing scene:', error);
                transitionStarted = false;
                if (currentActiveScene) {
                    currentActiveScene.enabled = false;
                }
                // Re-enable old scene if there was an error
                if (nextScene) {
                    nextScene.enabled = true;
                    // Revert references on error
                    currentActiveScene = nextScene;
                    currentSceneId = oldCurrentSceneId;
                }
                return;
            }

            // After transition completes, clean up old scene (which is now in nextScene)
            const timeoutId = setTimeout(() => {
                try {
                    // currentActiveScene and currentSceneId are already updated above
                    // Just clean up the old scene (nextScene)
                    
                    // Now clean up the old scene (which is now in nextScene): remove all scripts
                    if (nextScene && nextScene.script) {
                        nextScene.script?.destroy(GsplatRevealRadial.scriptName);
                        nextScene.script?.destroy(GsplatRevealRain.scriptName);
                        nextScene.script?.destroy(GsplatRevealGridEruption.scriptName);
                        nextScene.script?.destroy(GsplatRevealInstant.scriptName);
                        nextScene.script?.destroy(GsplatRevealFade.scriptName);
                        nextScene.script?.destroy(GsplatRevealSpread.scriptName);
                        nextScene.script?.destroy(GsplatRevealUnroll.scriptName);
                        nextScene.script?.destroy(GsplatRevealTwister.scriptName);
                        nextScene.script?.destroy(GsplatRevealMagic.scriptName);
                        // Scene is already disabled (was disabled at start of transition)
                        nextScene.renderOrder = 1; // Reset render order for future use
                    }
                    
                    // Ensure current active scene is properly set on top
                    // Only disable if reveal hasn't been started yet (no reveal script)
                    if (currentActiveScene) {
                        currentActiveScene.renderOrder = 1;
                        
                        // Check if reveal script exists - if it does, keep scene enabled
                        const hasRevealScript = currentActiveScene.script?.get(GsplatRevealRadial.scriptName) ||
                                               currentActiveScene.script?.get(GsplatRevealRain.scriptName) ||
                                               currentActiveScene.script?.get(GsplatRevealGridEruption.scriptName) ||
                                               currentActiveScene.script?.get(GsplatRevealInstant.scriptName) ||
                                               currentActiveScene.script?.get(GsplatRevealFade.scriptName) ||
                                               currentActiveScene.script?.get(GsplatRevealSpread.scriptName) ||
                                               currentActiveScene.script?.get(GsplatRevealUnroll.scriptName) ||
                                               currentActiveScene.script?.get(GsplatRevealTwister.scriptName) ||
                                               currentActiveScene.script?.get(GsplatRevealMagic.scriptName) ||
                                               scene1Script;
                        
                        if (!hasRevealScript) {
                            // No reveal script - keep scene disabled (black screen) until user clicks "Reveal Scene"
                            currentActiveScene.enabled = false;
                        } else {
                            // Reveal script exists - keep scene enabled
                        }
                    }
                    
                    // CRITICAL: Ensure ALL other scenes are disabled
                    Object.values(sceneEntities).forEach((sceneEntity) => {
                        if (sceneEntity && sceneEntity !== currentActiveScene && sceneEntity.enabled) {
                            sceneEntity.enabled = false;
                        }
                    });
                    
                    // Clear script references - no reveal script until user clicks "Reveal Scene"
                    scene1Script = null;
                    
                    // Update camera focus to new active scene
                    if (orbitCameraScript) {
                        orbitCameraScript.focusEntity = currentActiveScene;
                    }
                    
                    // Emit event to update UI
                    data.emit('sceneChanged', currentSceneId);
                    
                    // Reset transition flag to allow next transition
                    transitionStarted = false;
                } catch (error) {
                    console.error('Error in transition cleanup:', error);
                    transitionStarted = false;
                }
            }, safeReverseDuration * 1000);

            // Store timeout ID for potential cleanup
            if (window._sceneTransitionTimeout) {
                clearTimeout(window._sceneTransitionTimeout);
            }
            window._sceneTransitionTimeout = timeoutId;

        } catch (error) {
            console.error('Unexpected error in startSceneTransition:', error);
            transitionStarted = false;
            // Try to restore state
            if (nextScene) {
                nextScene.enabled = false;
            }
        }
    };

    // Handle load full scene animation
    data.on('loadFullScene', () => {
        const script = currentActiveScene.script?.get(GsplatRevealRadial.scriptName);
        if (!script) {
            console.warn('Load full scene: radial script not found');
            return;
        }
        
        // Build version for tracking (must match version in reveal.controls.mjs)
        const BUILD_VERSION = 'v1.7.9';
        console.log(`[Build ${BUILD_VERSION}] Starting load full scene animation`);
        
        // Reset hide scene progress when loading full scene
        script.hideSceneProgress = 0.0;
        
        // Анимация от текущего значения до 1.0 за указанное время
        const duration = data.get('loadFullSceneDuration') ?? 1.5;
        const startTime = Date.now() / 1000; // Convert to seconds
        const startProgress = script.loadFullSceneProgress || 0.0;
        const targetProgress = 1.0;
        
        const animate = () => {
            const currentTime = Date.now() / 1000;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            
            // Easing function (ease-out cubic)
            const eased = progress >= 1.0 ? 1.0 : (1.0 - Math.pow(1.0 - progress, 3));
            script.loadFullSceneProgress = startProgress + (targetProgress - startProgress) * eased;
            
            if (progress < 1.0) {
                requestAnimationFrame(animate);
            } else {
                // Убрано прямое присваивание - easing уже должен дать 1.0
                console.log(`[Build ${BUILD_VERSION}] Full scene loaded (final progress: ${script.loadFullSceneProgress.toFixed(6)})`);
            }
        };
        
        animate();
    });

    // Handle hide scene animation (Room Hide using box shader effect)
    data.on('hideScene', () => {
        const radialScript = currentActiveScene.script?.get(GsplatRevealRadial.scriptName);
        // Reset radial hide progress to avoid legacy behavior
        if (radialScript) {
            radialScript.hideSceneProgress = 0.0;
        }

        const boxEffect = getOrCreateBoxEffect(currentActiveScene, GsplatBoxShaderEffect);
        if (!boxEffect) {
            console.warn('Hide scene: box shader effect not found/created');
            return;
        }

        const duration = data.get('hideSceneDuration') ?? 2.0;
        const endRadius = data.get('endRadius') || radialScript?.endRadius || 25;
        const hideSceneMode = data.get('hideSceneMode') ?? 0;
        const layerThickness = data.get('hideSceneLayerThickness') ?? 0.1;

        // Configure AABB around origin using endRadius
        boxEffect.aabbMin.set(-endRadius, -endRadius, -endRadius);
        boxEffect.aabbMax.set(endRadius, endRadius, endRadius);

        // Direction based on mode
        if (hideSceneMode === 0) {
            boxEffect.direction.set(0, 1, 0); // bottom -> top
        } else if (hideSceneMode === 1) {
            boxEffect.direction.set(0, -1, 0); // top -> bottom
        } else {
            // From camera towards scene center
            camera.getWorldTransform().getTranslation(tmpVec3);
            tmpVec3.normalize();
            boxEffect.direction.copy(tmpVec3);
        }

        // Use layerThickness as edge interval (converted to sweep distance fraction)
        boxEffect.interval = Math.max(0.01, layerThickness);
        boxEffect.duration = duration;
        boxEffect.visibleStart = true;
        boxEffect.visibleEnd = false;
        boxEffect.invertTint = false;

        // Reset and run effect by toggling enabled
        boxEffect.enabled = false;
        boxEffect.enabled = true;

        console.log('Starting Room Hide effect', {
            duration,
            endRadius,
            hideSceneMode,
            layerThickness,
            direction: boxEffect.direction
        });
    });

    // Handle scene transition (backward compatibility)
    data.on('nextScene', () => {
        if (!transitionStarted) {
            // Find next scene in the list
            const currentIndex = availableScenes.findIndex(s => s.id === currentSceneId);
            const nextIndex = (currentIndex + 1) % availableScenes.length;
            const nextSceneId = availableScenes[nextIndex].id;
            changeToScene(nextSceneId);
        }
    });
    
    // Note: changeScene handler is registered BEFORE assetListLoader.load() to ensure it's ready
    
    // Initialize current scene ID (scenes already set earlier from API)
    console.log(`[Build ${BUILD_VERSION}] Available scenes array:`, availableScenes);
    console.log(`[Build ${BUILD_VERSION}] Available scenes count:`, availableScenes.length);
    data.set('currentSceneId', currentSceneId);
    // Verify scenes are set correctly
    const verifyScenes = data.get('availableScenes');
    console.log(`[Build ${BUILD_VERSION}] Verified scenes in observer:`, verifyScenes, 'count:', verifyScenes?.length);

    // Auto-rotate update
    app.on('update', (dt) => {
        // Re-enable auto-rotate after delay (only if not paused)
        if (!cameraPaused && !autoRotateEnabled && (Date.now() - lastInteractionTime) / 1000 > autoRotateDelay) {
            autoRotateEnabled = true;
        }

        // Apply auto-rotation (only if not paused)
        if (!cameraPaused && autoRotateEnabled) {
            const orbitCamera = camera.script?.get('orbitCamera');
            if (orbitCamera) {
                orbitCamera.yaw += autoRotateSpeed * dt;
            }
        }
    });
});

export { app };
