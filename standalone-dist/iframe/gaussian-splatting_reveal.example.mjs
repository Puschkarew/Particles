import { data } from 'examples/observer';
import { fileImport, rootPath, deviceType } from 'examples/utils';

// @config DESCRIPTION This example demonstrates reveal effects for gaussian splats.
const { GsplatRevealRadial } = await fileImport(`${rootPath}/static/scripts/esm/gsplat/reveal-radial.mjs`);
const { GsplatRevealRain } = await fileImport(`${rootPath}/static/scripts/esm/gsplat/reveal-rain.mjs`);
const { GsplatRevealGridEruption } = await fileImport(`${rootPath}/static/scripts/esm/gsplat/reveal-grid-eruption.mjs`);
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

// Define available scenes with their names and PLY file paths
const availableScenes = [
    { name: 'Future', plyFile: 'Future.ply', id: 'future' },
    { name: 'Ceramic', plyFile: 'Ceramic.ply', id: 'ceramic' },
    { name: 'Room', plyFile: 'Room.ply', id: 'room' }
];

// Create assets for all scenes
const assets = {
    orbit: new pc.Asset('script', 'script', { url: `${rootPath}/static/scripts/camera/orbit-camera.js` })
};

// Create assets for each scene
availableScenes.forEach(scene => {
    assets[scene.id] = new pc.Asset(`gsplat-${scene.id}`, 'gsplat', { 
        url: `${rootPath}/static/assets/splats/${scene.plyFile}` 
    });
});

const assetListLoader = new pc.AssetListLoader(Object.values(assets), app.assets);
assetListLoader.load(() => {
    app.start();

    // Storage key for settings
    const SETTINGS_STORAGE_KEY = 'reveal-settings';

    // Load settings from localStorage
    const loadSettings = () => {
        try {
            const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (saved) {
                const settings = JSON.parse(saved);
                // Apply all saved settings to observer
                Object.keys(settings).forEach(key => {
                    data.set(key, settings[key]);
                });
                // Force hidden motion parameters to 0 (they should not be saved/loaded)
                data.set('dispersiveMotionSpeed', 0);
                data.set('flagMotionSpeed', 0);
                data.set('waveMotionSpeed', 0);
                return settings;
            }
        } catch (e) {
            console.warn('Failed to load settings from localStorage:', e);
        }
        return null;
    };

    // Save settings to localStorage
    const saveSettings = () => {
        try {
            const settings = {};
            // List of all settings keys to save
            // Note: dispersiveMotionSpeed, flagMotionSpeed, waveMotionSpeed are hidden and not saved
            const settingsKeys = [
                'speed', 'acceleration', 'delay', 'pointMotionSpeed', 'floatMotionSpeed',
                'pointCloudScale',
                'pointCloudDensity', 'dotWaveThickness', 'oceanWaveThickness', 'oceanWaveInterval',
                'oceanWaveSpeedMultiplier', 'oceanWaveLiftScale', 'oceanWaveBrightness',
                'waveSpeed', 'waveAmplitude', 'distanceDarkening', 'baseBrightness',
                'oscillationIntensity', 'endRadius', 'revealStartRadius',
                'pointCloudOpacity', 'dotTintHex', 'effect',
                'loadFullSceneDuration', 'loadFullSceneWaveThickness', 'loadFullSceneMotionFadeRange',
                'hideSceneDuration', 'hideSceneMode', 'hideSceneLayerThickness'
            ];
            
            settingsKeys.forEach(key => {
                const value = data.get(key);
                if (value !== undefined && value !== null) {
                    settings[key] = value;
                }
            });
            
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
            console.log('Settings saved to localStorage:', settings);
        } catch (e) {
            console.warn('Failed to save settings to localStorage:', e);
        }
    };

    // Array of available effects (extensible for future effects)
    const effects = ['radial', 'rain', 'grid'];

    // Default to radial effect
    data.set('effect', 'radial');

    // Load saved settings IMMEDIATELY (before creating script)
    // This ensures script is created with correct settings from the start
    let savedSettings = null;
    let settingsLoaded = false;
    savedSettings = loadSettings();
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

    // Auto-save settings when they change
    const settingsKeys = [
        'speed', 'acceleration', 'delay', 'pointMotionSpeed', 'floatMotionSpeed',
        'dispersiveMotionSpeed', 'flagMotionSpeed', 'waveMotionSpeed', 'pointCloudScale',
        'pointCloudDensity', 'dotWaveThickness', 'oceanWaveThickness', 'oceanWaveInterval',
        'oceanWaveSpeedMultiplier', 'oceanWaveLiftScale', 'oceanWaveBrightness',
        'waveSpeed', 'waveAmplitude', 'distanceDarkening', 'baseBrightness',
        'oscillationIntensity', 'endRadius', 'revealStartRadius',
        'pointCloudOpacity', 'dotTintHex', 'effect',
        'loadFullSceneDuration', 'loadFullSceneWaveThickness', 'loadFullSceneMotionFadeRange',
        'hideSceneDuration', 'hideSceneMode', 'hideSceneLayerThickness'
    ];

    // Debounce save to avoid too frequent localStorage writes
    let saveTimeout = null;
    const debouncedSave = () => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const currentSpeed = data.get('speed');
            console.log('💾 Saving settings to localStorage, current speed:', currentSpeed);
            saveSettings();
        }, 300); // Save after 300ms of inactivity
    };

    // Listen to all setting changes and auto-save (but only after initial setup)
    // IMPORTANT: Don't save during initial load to prevent overwriting saved settings with defaults
    let settingsInitialized = false;
    let initialLoadComplete = false;
    
    // Mark initial load as complete after a delay (to allow controls to initialize and settings to stabilize)
    setTimeout(() => {
        initialLoadComplete = true;
        console.log('✅ Initial load complete, auto-save enabled');
    }, 600); // Increased delay to ensure all initialization is done
    
    setTimeout(() => {
        settingsInitialized = true;
        settingsKeys.forEach(key => {
            data.on(`${key}:set`, (value) => {
                // Only save if:
                // 1. Settings system is initialized
                // 2. Initial load is complete (prevents saving defaults during load)
                // 3. This is not the initial load of saved settings
                if (settingsInitialized && initialLoadComplete) {
                    // Check if this is a user-initiated change (not from loading saved settings)
                    const isUserChange = !savedSettings || savedSettings[key] === undefined || Math.abs(savedSettings[key] - value) > 0.001;
                    if (isUserChange) {
                        console.log(`📝 User changed setting: ${key} = ${value}, will save...`);
                        debouncedSave();
                    } else {
                        console.log(`⏸️ Setting ${key} = ${value} matches saved value, skipping save`);
                    }
                } else {
                    console.log(`⏸️ Setting changed during initial load: ${key} = ${value}, skipping save`);
                }
            });
        });
    }, 200);

    // Current scene tracking
    let currentSceneId = 'future'; // ID of currently active scene
    
    // Store scene entities by their ID
    const sceneEntities = {};
    
    // Create initial scene (Future)
    const createSceneEntity = (sceneId) => {
        const sceneConfig = availableScenes.find(s => s.id === sceneId);
        if (!sceneConfig) {
            console.error(`Scene with id "${sceneId}" not found`);
            return null;
        }
        
        const asset = assets[sceneId];
        if (!asset) {
            console.error(`Asset for scene "${sceneId}" not found`);
            return null;
        }
        
        const entity = new pc.Entity(`scene-${sceneId}`);
        // Disable entity BEFORE adding to root to prevent any rendering before it's ready
        entity.enabled = false;
        entity.addComponent('gsplat', {
            asset: asset,
            unified: true
        });
        entity.setLocalEulerAngles(180, 0, 0);
        entity.addComponent('script');
        app.root.addChild(entity);
        
        return entity;
    };
    
    // Create initial scene (Future - will be enabled)
    const scene1 = createSceneEntity('future');
    scene1.enabled = true; // Enable Future scene as initial active scene
    sceneEntities['future'] = scene1;
    
    // Create second scene for transitions (initially hidden)
    const scene2 = createSceneEntity('ceramic');
    scene2.renderOrder = 1;
    // scene2 is already disabled from createSceneEntity, but ensure it stays disabled
    scene2.enabled = false;
    sceneEntities['ceramic'] = scene2;

    // Helper function to apply observer settings to radial script
    const tmpVec3 = new pc.Vec3();

    const applySettingsToRadialScript = (script, force = false) => {
        if (!script) return;
        
        // Apply settings from observer - force mode applies even if value is 0
        const speed = data.get('speed');
        if (force || (speed !== undefined && speed !== null)) {
            script.speed = speed !== undefined && speed !== null ? speed : script.speed;
        }
        
        const acceleration = data.get('acceleration');
        if (force || (acceleration !== undefined && acceleration !== null)) {
            script.acceleration = acceleration !== undefined && acceleration !== null ? acceleration : script.acceleration;
        }
        
        const delay = data.get('delay');
        if (force || (delay !== undefined && delay !== null)) {
            script.delay = delay !== undefined && delay !== null ? delay : script.delay;
        }
        
        const oscillationIntensity = data.get('oscillationIntensity');
        if (force || (oscillationIntensity !== undefined && oscillationIntensity !== null)) {
            script.oscillationIntensity = oscillationIntensity !== undefined && oscillationIntensity !== null ? oscillationIntensity : script.oscillationIntensity;
        }
        
        const endRadius = data.get('endRadius');
        if (force || (endRadius !== undefined && endRadius !== null)) {
            script.endRadius = endRadius !== undefined && endRadius !== null ? endRadius : script.endRadius;
        }
        
        const revealStartRadius = data.get('revealStartRadius');
        if (force || (revealStartRadius !== undefined && revealStartRadius !== null)) {
            script.revealStartRadius = revealStartRadius !== undefined && revealStartRadius !== null ? revealStartRadius : script.revealStartRadius;
        }
        
        const pointCloudScale = data.get('pointCloudScale');
        if (force || (pointCloudScale !== undefined && pointCloudScale !== null)) {
            script.pointCloudScale = pointCloudScale !== undefined && pointCloudScale !== null ? pointCloudScale : script.pointCloudScale;
        }
        
        const pointCloudDensity = data.get('pointCloudDensity');
        if (force || (pointCloudDensity !== undefined && pointCloudDensity !== null)) {
            script.pointCloudDensity = pointCloudDensity !== undefined && pointCloudDensity !== null ? pointCloudDensity : script.pointCloudDensity;
        }
        
        const pointCloudOpacity = data.get('pointCloudOpacity');
        if (force || (pointCloudOpacity !== undefined && pointCloudOpacity !== null)) {
            script.pointCloudOpacity = pointCloudOpacity !== undefined && pointCloudOpacity !== null ? pointCloudOpacity : script.pointCloudOpacity;
        }
        
        const dotWaveThickness = data.get('dotWaveThickness');
        if (force || (dotWaveThickness !== undefined && dotWaveThickness !== null)) {
            script.dotWaveThickness = dotWaveThickness !== undefined && dotWaveThickness !== null ? dotWaveThickness : script.dotWaveThickness;
        }
        
        const oceanWaveThickness = data.get('oceanWaveThickness');
        if (force || (oceanWaveThickness !== undefined && oceanWaveThickness !== null)) {
            script.oceanWaveThickness = oceanWaveThickness !== undefined && oceanWaveThickness !== null ? oceanWaveThickness : script.oceanWaveThickness;
        }
        
        const oceanWaveInterval = data.get('oceanWaveInterval');
        if (force || (oceanWaveInterval !== undefined && oceanWaveInterval !== null)) {
            script.oceanWaveInterval = oceanWaveInterval !== undefined && oceanWaveInterval !== null ? oceanWaveInterval : script.oceanWaveInterval;
        }
        
        const oceanWaveSpeedMultiplier = data.get('oceanWaveSpeedMultiplier');
        if (force || (oceanWaveSpeedMultiplier !== undefined && oceanWaveSpeedMultiplier !== null)) {
            script.oceanWaveSpeedMultiplier = oceanWaveSpeedMultiplier !== undefined && oceanWaveSpeedMultiplier !== null ? oceanWaveSpeedMultiplier : script.oceanWaveSpeedMultiplier;
        }
        
        const oceanWaveLiftScale = data.get('oceanWaveLiftScale');
        if (force || (oceanWaveLiftScale !== undefined && oceanWaveLiftScale !== null)) {
            script.oceanWaveLiftScale = oceanWaveLiftScale !== undefined && oceanWaveLiftScale !== null ? oceanWaveLiftScale : script.oceanWaveLiftScale;
        }
        
        const oceanWaveBrightness = data.get('oceanWaveBrightness');
        if (force || (oceanWaveBrightness !== undefined && oceanWaveBrightness !== null)) {
            script.oceanWaveBrightness = oceanWaveBrightness !== undefined && oceanWaveBrightness !== null ? oceanWaveBrightness : script.oceanWaveBrightness;
        }
        
        const waveSpeed = data.get('waveSpeed');
        if (force || (waveSpeed !== undefined && waveSpeed !== null)) {
            script.waveSpeed = waveSpeed !== undefined && waveSpeed !== null ? waveSpeed : script.waveSpeed;
        }
        
        const waveAmplitude = data.get('waveAmplitude');
        if (force || (waveAmplitude !== undefined && waveAmplitude !== null)) {
            script.waveAmplitude = waveAmplitude !== undefined && waveAmplitude !== null ? waveAmplitude / 10 : script.waveAmplitude; // Convert from 0-1 to 0-0.1
        }
        
        const distanceDarkening = data.get('distanceDarkening');
        if (force || (distanceDarkening !== undefined && distanceDarkening !== null)) {
            script.distanceDarkening = distanceDarkening !== undefined && distanceDarkening !== null ? distanceDarkening : script.distanceDarkening;
        }
        
        const baseBrightness = data.get('baseBrightness');
        if (force || (baseBrightness !== undefined && baseBrightness !== null)) {
            script.baseBrightness = baseBrightness !== undefined && baseBrightness !== null ? baseBrightness : script.baseBrightness;
        }
        
        const floatMotionSpeed = data.get('floatMotionSpeed');
        if (force || (floatMotionSpeed !== undefined && floatMotionSpeed !== null)) {
            script.floatMotionSpeed = floatMotionSpeed !== undefined && floatMotionSpeed !== null ? floatMotionSpeed : script.floatMotionSpeed;
        }
        
        const dispersiveMotionSpeed = data.get('dispersiveMotionSpeed');
        if (force || (dispersiveMotionSpeed !== undefined && dispersiveMotionSpeed !== null)) {
            script.dispersiveMotionSpeed = dispersiveMotionSpeed !== undefined && dispersiveMotionSpeed !== null ? dispersiveMotionSpeed : script.dispersiveMotionSpeed;
        }
        
        const flagMotionSpeed = data.get('flagMotionSpeed');
        if (force || (flagMotionSpeed !== undefined && flagMotionSpeed !== null)) {
            script.flagMotionSpeed = flagMotionSpeed !== undefined && flagMotionSpeed !== null ? flagMotionSpeed : script.flagMotionSpeed;
        }
        
        const waveMotionSpeed = data.get('waveMotionSpeed');
        if (force || (waveMotionSpeed !== undefined && waveMotionSpeed !== null)) {
            script.waveMotionSpeed = waveMotionSpeed !== undefined && waveMotionSpeed !== null ? waveMotionSpeed : script.waveMotionSpeed;
        }
        
        const pointMotionSpeed = data.get('pointMotionSpeed');
        if (force || (pointMotionSpeed !== undefined && pointMotionSpeed !== null)) {
            script.pointMotionSpeed = pointMotionSpeed !== undefined && pointMotionSpeed !== null ? pointMotionSpeed : script.pointMotionSpeed;
        }
        
        // Load Full Scene animation settings
        const loadFullSceneWaveThickness = data.get('loadFullSceneWaveThickness');
        if (force || (loadFullSceneWaveThickness !== undefined && loadFullSceneWaveThickness !== null)) {
            script.loadFullSceneWaveThickness = loadFullSceneWaveThickness !== undefined && loadFullSceneWaveThickness !== null ? loadFullSceneWaveThickness : script.loadFullSceneWaveThickness;
        }
        
        const loadFullSceneMotionFadeRange = data.get('loadFullSceneMotionFadeRange');
        if (force || (loadFullSceneMotionFadeRange !== undefined && loadFullSceneMotionFadeRange !== null)) {
            script.loadFullSceneMotionFadeRange = loadFullSceneMotionFadeRange !== undefined && loadFullSceneMotionFadeRange !== null ? loadFullSceneMotionFadeRange : script.loadFullSceneMotionFadeRange;
        }
        
        // Hide Scene animation settings
        const hideSceneMode = data.get('hideSceneMode');
        if (force || (hideSceneMode !== undefined && hideSceneMode !== null)) {
            script.hideSceneMode = hideSceneMode !== undefined && hideSceneMode !== null ? hideSceneMode : script.hideSceneMode;
        }
        
        const hideSceneLayerThickness = data.get('hideSceneLayerThickness');
        if (force || (hideSceneLayerThickness !== undefined && hideSceneLayerThickness !== null)) {
            script.hideSceneLayerThickness = hideSceneLayerThickness !== undefined && hideSceneLayerThickness !== null ? hideSceneLayerThickness : script.hideSceneLayerThickness;
        }
        
        // Set Y range based on endRadius (approximate scene bounds)
        const hideEndRadius = data.get('endRadius') || script.endRadius || 25;
        script.hideSceneMinY = -hideEndRadius;
        script.hideSceneMaxY = hideEndRadius;
        
        // Color settings
        const dotTintHex = data.get('dotTintHex');
        if (dotTintHex) {
            const dotTintMatch = dotTintHex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
            if (dotTintMatch) {
                script.dotTint.set(
                    parseInt(dotTintMatch[1], 16) / 255,
                    parseInt(dotTintMatch[2], 16) / 255,
                    parseInt(dotTintMatch[3], 16) / 255
                );
            }
        }
    };

    // Helper to get or create box shader effect on an entity
    const getOrCreateBoxEffect = (entity) => {
        if (!entity) return null;
        if (!entity.script) {
            entity.addComponent('script');
        }
        let effect = entity.script.get(GsplatBoxShaderEffect.scriptName);
        if (!effect) {
            effect = entity.script.create(GsplatBoxShaderEffect);
        }
        return effect;
    };

    // Helper function to create radial script with configured attributes
    const createRadialScript = (entity, reverseMode = false, reverseSpeedValue = 5.0) => {
        if (!entity) {
            console.error('createRadialScript: entity is null or undefined');
            return null;
        }
        if (!entity.script) {
            console.error('createRadialScript: entity missing script component', entity.name);
            return null;
        }
        if (!entity.gsplat) {
            console.error('createRadialScript: entity missing gsplat component', entity.name);
            return null;
        }
        if (!GsplatRevealRadial) {
            console.error('createRadialScript: GsplatRevealRadial is not available');
            return null;
        }

        try {
            // Destroy any existing reveal script first
            entity.script?.destroy(GsplatRevealRadial.scriptName);
            
            const script = entity.script.create(GsplatRevealRadial);
            if (!script) {
                console.error('createRadialScript: failed to create script instance');
                return null;
            }

            try {
                script.center.set(0, 0, 0);
                // Set default values first (will be overridden by applySettingsToRadialScript if settings exist)
                script.speed = 5;
                script.acceleration = 0;
                script.delay = 3;
                script.dotTint.set(0, 1, 1); // Cyan
                script.waveTint.set(1, 0.5, 0); // Orange
                script.oscillationIntensity = 0.2;
                script.endRadius = 25;
                // Новые параметры для эффекта опускания
                script.descentHeight = 0.5; // Высота, с которой начинают падать точки
                script.descentDuration = 2.5; // Расстояние, на котором происходит опускание
                // Reverse mode parameters
                script.reverseMode = reverseMode;
                script.reverseSpeed = reverseMode ? reverseSpeedValue : 1.0;
                // Apply ALL settings from observer (will override defaults if they exist)
                // This is the key: applySettingsToRadialScript reads from observer and applies to script
                // Use force=true to ensure settings are applied even if they are 0 or falsy
                applySettingsToRadialScript(script, true);
                
                // Double-check critical settings after application
                const finalSpeed = data.get('speed');
                if (finalSpeed !== undefined && finalSpeed !== null && Math.abs(script.speed - finalSpeed) > 0.001) {
                    console.warn(`Speed mismatch in createRadialScript: script has ${script.speed}, observer has ${finalSpeed}, fixing...`);
                    script.speed = finalSpeed;
                }
                
                // Ensure script is enabled to apply shaders
                script.enabled = true;
            } catch (error) {
                console.error('createRadialScript: error setting script properties:', error);
                // Try to destroy the script if property setting failed
                try {
                    entity.script.destroy(GsplatRevealRadial.scriptName);
                } catch (destroyError) {
                    console.error('createRadialScript: error destroying failed script:', destroyError);
                }
                return null;
            }

            return script;
        } catch (error) {
            console.error('createRadialScript: unexpected error:', error);
            return null;
        }
    };

    // Helper function to create rain script with configured attributes
    const createRainScript = (entity = currentActiveScene) => {
        const script = entity.script?.create(GsplatRevealRain);
        if (script) {
            script.center.set(0, 0, 0);
            script.distance = 30;
            script.speed = 3;
            script.acceleration = 0;
            script.flightTime = 2;
            script.rainSize = 0.015;
            script.rotation = 0.9; // 90% of full circle rotation during fall
            script.fallTint.set(0, 1, 1); // Cyan tint during fall
            script.fallTintIntensity = 0.2;
            script.hitTint.set(2, 0, 0); // Bright red flash on landing
            script.hitDuration = 0.5;
            script.endRadius = 25;
        }
        return script;
    };

    // Helper function to create grid eruption script with configured attributes
    const createGridScript = (entity = currentActiveScene) => {
        const script = entity.script?.create(GsplatRevealGridEruption);
        if (script) {
            script.center.set(0, 0, 0);
            script.blockCount = 10;
            script.blockSize = 2;
            script.delay = 0.2;
            script.duration = 1.0;
            script.dotSize = 0.01;
            script.moveTint.set(1, 0, 1); // Magenta during movement
            script.moveTintIntensity = 0.2; // 20% blend with original color
            script.landTint.set(2, 2, 0); // Yellow flash on landing
            script.landDuration = 0.6;
            script.endRadius = 25;
        }
        return script;
    };

    /**
     * Function to create and start an effect based on its name
     * @param {string} effectName - Name of the effect to create
     * @param {pc.Entity} entity - Entity to apply effect to (default: currentActiveScene)
     */
    const createEffect = (effectName, entity = currentActiveScene) => {
        // Destroy any existing reveal scripts
        entity.script?.destroy(GsplatRevealRadial.scriptName);
        entity.script?.destroy(GsplatRevealRain.scriptName);
        entity.script?.destroy(GsplatRevealGridEruption.scriptName);

        // Create the selected effect (fresh instance, starts from beginning)
        let createdScript = null;
        if (effectName === 'radial') {
            createdScript = createRadialScript(entity, false);
            // Update script references (for backward compatibility)
            if (entity === currentActiveScene) {
                scene1Script = createdScript;
            } else {
                scene2Script = createdScript;
            }
        } else if (effectName === 'rain') {
            createdScript = createRainScript(entity);
        } else if (effectName === 'grid') {
            createdScript = createGridScript(entity);
        }
        
        return createdScript;
    };

    // Variables for scene transition
    let scene1Script = null;
    let scene2Script = null;
    let transitionStarted = false;
    let currentActiveScene = scene1; // Track which scene is currently active
    let nextScene = scene2; // Track which scene will be shown next
    
    // Function to change to a specific scene
    const changeToScene = (targetSceneId) => {
        if (transitionStarted) {
            console.warn('Transition already in progress, ignoring request');
            return;
        }
        
        if (targetSceneId === currentSceneId) {
            console.log(`Already on scene "${targetSceneId}"`);
            return;
        }
        
        // Find or create the target scene entity
        let targetScene = sceneEntities[targetSceneId];
        if (!targetScene) {
            targetScene = createSceneEntity(targetSceneId);
            if (!targetScene) {
                console.error(`Failed to create scene "${targetSceneId}"`);
                return;
            }
            targetScene.renderOrder = 1;
            targetScene.enabled = false;
            sceneEntities[targetSceneId] = targetScene;
            
            // Note: Effect will be initialized during transition to ensure shaders are ready
            // when the scene is enabled
        }
        
        // Set next scene for transition
        nextScene = targetScene;
        
        // Start transition
        startSceneTransition();
    };

    // Sync observer settings to active script in real-time
    const syncSettingsToScript = () => {
        const currentEffect = data.get('effect');
        if (currentEffect === 'radial') {
            const script = currentActiveScene.script?.get(GsplatRevealRadial.scriptName);
            if (script) {
                applySettingsToRadialScript(script);
            }
        }
        // Note: Rain and Grid effects don't have full settings sync yet
    };

    // Define function to apply loaded settings (after syncSettingsToScript is defined)
    applyLoadedSettings = () => {
        if (settingsLoaded && currentActiveScene) {
            // For radial effect, recreate the script to ensure it starts with correct settings
            const currentEffect = data.get('effect');
            if (currentEffect === 'radial') {
                // Recreate the script with loaded settings
                const newScript = createRadialScript(currentActiveScene, false);
                if (newScript) {
                    // Update script reference
                    if (currentActiveScene === scene1) {
                        scene1Script = newScript;
                    } else if (currentActiveScene === scene2) {
                        scene2Script = newScript;
                    }
                    console.log('Applied loaded settings to script, speed:', newScript.speed);
                }
            } else {
                // For other effects, just sync settings
                syncSettingsToScript();
            }
        }
    };

    // Listen to all setting changes and sync to active script (only after script is created)
    let scriptReady = false;
    setTimeout(() => {
        scriptReady = true;
        settingsKeys.forEach(key => {
            data.on(`${key}:set`, () => {
                if (scriptReady) {
                    syncSettingsToScript();
                }
            });
        });
    }, 300);

    // Create only the radial script initially on scene1
    // If settings were loaded, they are already in observer, so script will use them
    scene1Script = createEffect('radial', scene1);
    
    // CRITICAL: If settings were loaded, immediately verify and fix script settings
    // This must happen synchronously right after script creation
    if (scene1Script && savedSettings) {
        const expectedSpeed = savedSettings.speed;
        const currentSpeed = scene1Script.speed;
        const observerSpeed = data.get('speed');
        
        console.log('=== INITIAL SETTINGS VERIFICATION ===');
        console.log('Script speed after creation:', currentSpeed);
        console.log('Observer speed:', observerSpeed);
        console.log('Saved speed from localStorage:', expectedSpeed);
        
        // ALWAYS re-apply saved settings to ensure they are correct
        // This is necessary because script may have started with defaults before settings were applied
        if (expectedSpeed !== undefined) {
            console.log('Re-applying ALL saved settings to ensure correctness...');
            
            // First, ensure observer has correct values (re-apply to be sure)
            Object.keys(savedSettings).forEach(key => {
                data.set(key, savedSettings[key]);
            });
            
            // Then force apply to script with ALL settings
            applySettingsToRadialScript(scene1Script, true);
            
            // Verify it worked
            const newSpeed = scene1Script.speed;
            console.log('After re-apply, script speed:', newSpeed);
            
            // If still mismatched, recreate script (this ensures animation restarts with correct values)
            if (Math.abs(newSpeed - expectedSpeed) > 0.001) {
                console.warn('⚠️ Speed still mismatched after re-apply. Recreating script to restart animation...');
                scene1Script = createEffect('radial', scene1);
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
        console.log('=====================================');
    } else if (scene1Script) {
        console.log('ℹ️ Script created, no saved settings to verify');
    }

    // Apply loaded settings to the script after controls initialize (as fallback)
    // This ensures settings are re-applied if controls override them
    setTimeout(() => {
        if (savedSettings && scene1Script) {
            console.log('=== RE-APPLYING SETTINGS AFTER CONTROLS INIT ===');
            // Re-apply all saved settings to observer first
            Object.keys(savedSettings).forEach(key => {
                data.set(key, savedSettings[key]);
            });
            // Then force apply to script
            applySettingsToRadialScript(scene1Script, true);
            console.log('Final script speed after re-apply:', scene1Script.speed);
            console.log('===============================================');
        } else if (applyLoadedSettings && savedSettings) {
            console.log('Re-applying settings after controls init (using applyLoadedSettings)...');
            applyLoadedSettings();
        }
    }, 250); // After controls have initialized (increased delay to ensure controls are ready)

    // Switch between effects when dropdown changes
    data.on('effect:set', () => {
        const effect = data.get('effect');
        createEffect(effect);
    });

    // Restart button - recreate current effect from beginning
    data.on('restart', () => {
        const currentEffect = data.get('effect');
        createEffect(currentEffect);
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
        toneMapping: pc.TONEMAP_ACES
    });
    camera.setLocalPosition(3, 1, 0.5);

    // add orbit camera script with a mouse and a touch support
    camera.addComponent('script');
    const orbitCameraScript = camera.script?.create('orbitCamera', {
        attributes: {
            inertiaFactor: 0.2,
            focusEntity: currentActiveScene,
            distanceMax: 3.2,
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
     */
    const startSceneTransition = () => {
        if (transitionStarted) {
            console.warn('Transition already in progress, ignoring request');
            return;
        }

        // Validate entities exist
        if (!currentActiveScene || !nextScene) {
            console.error('Scene transition failed: missing scene entities', {
                currentActiveScene: !!currentActiveScene,
                nextScene: !!nextScene
            });
            return;
        }

        // Validate that scenes have script components
        if (!currentActiveScene.script) {
            console.error('Scene transition failed: currentActiveScene missing script component');
            return;
        }
        if (!nextScene.script) {
            console.error('Scene transition failed: nextScene missing script component');
            return;
        }

        transitionStarted = true;

        try {
            // Fixed transition parameters (no longer configurable)
            const currentReverseSpeed = 5.0;
            const currentOverlap = 0.5;

            // Get current active script to determine endRadius
            const currentScript = currentActiveScene.script?.get(GsplatRevealRadial.scriptName);
            
            // Calculate reverse animation duration
            // Time to hide current scene: (endRadius - revealStartRadius) / reverseSpeed
            const endRadius = currentScript?.endRadius ?? 25;
            const revealStartRadius = currentScript?.revealStartRadius ?? 0.3;
            const reverseDistance = Math.max(0, endRadius - revealStartRadius);
            
            // Prevent division by zero
            if (currentReverseSpeed <= 0) ;
            
            const reverseDuration = reverseDistance / currentReverseSpeed;
            
            // Ensure minimum duration to prevent issues
            const minDuration = 0.1;
            const safeReverseDuration = Math.max(minDuration, reverseDuration);

            // Calculate when to start next scene reveal based on overlap
            const nextSceneStartTime = safeReverseDuration * currentOverlap;

            // Start reverse reveal on current scene
            try {
                currentActiveScene.script?.destroy(GsplatRevealRadial.scriptName);
                const reverseScript = createRadialScript(currentActiveScene, true, currentReverseSpeed);
                if (!reverseScript) {
                    console.error('Failed to create reverse script');
                    transitionStarted = false;
                    return;
                }
                reverseScript.delay = 0; // Start immediately
            } catch (error) {
                console.error('Error creating reverse script:', error);
                transitionStarted = false;
                return;
            }

            // CRITICAL: Disable current scene FIRST to prevent overlap
            if (currentActiveScene) {
                currentActiveScene.enabled = false;
            }
            
            // Prepare next scene effect BEFORE enabling it
            try {
                // Get current effect to apply to next scene
                const currentEffect = data.get('effect') || 'radial';
                
                // Create the appropriate effect script for next scene BEFORE enabling
                // This ensures shaders are properly initialized
                let forwardScript = null;
                if (currentEffect === 'radial') {
                    forwardScript = createRadialScript(nextScene, false, 1.0);
                } else if (currentEffect === 'rain') {
                    forwardScript = createRainScript(nextScene);
                } else if (currentEffect === 'grid') {
                    forwardScript = createGridScript(nextScene);
                }
                
                if (!forwardScript) {
                    console.error('Failed to create forward script');
                    transitionStarted = false;
                    // Re-enable current scene if forward script failed
                    if (currentActiveScene) {
                        currentActiveScene.enabled = true;
                    }
                    return;
                }
                
                // Set delay for radial script, other effects might not support delay
                if (forwardScript.delay !== undefined) {
                    forwardScript.delay = nextSceneStartTime; // Start after overlap time
                }
                
                // Set render order to ensure proper layering (higher = on top)
                if (currentActiveScene) {
                    currentActiveScene.renderOrder = 0;
                }
                nextScene.renderOrder = 1;
                
                // Enable next scene AFTER effect is created and configured
                // This ensures shaders are ready before rendering starts
                nextScene.enabled = true;
            } catch (error) {
                console.error('Error creating forward script:', error);
                transitionStarted = false;
                if (nextScene) {
                    nextScene.enabled = false;
                }
                // Re-enable current scene if there was an error
                if (currentActiveScene) {
                    currentActiveScene.enabled = true;
                }
                return;
            }

            // After transition completes, clean up old scene and swap references
            const timeoutId = setTimeout(() => {
                try {
                    // Swap references: next scene becomes current, old current becomes next
                    // Note: currentActiveScene is already disabled above, so we just swap
                    const oldCurrent = currentActiveScene;
                    const oldCurrentSceneId = currentSceneId;
                    currentActiveScene = nextScene;
                    
                    // Find the new scene ID
                    const newSceneId = availableScenes.find(s => 
                        sceneEntities[s.id] === currentActiveScene
                    )?.id || currentSceneId;
                    currentSceneId = newSceneId;
                    
                    // Update nextScene to be the old current (for potential future transitions)
                    nextScene = oldCurrent;
                    
                    // Now clean up the old scene (which is now in nextScene): remove all scripts
                    if (nextScene && nextScene.script) {
                        nextScene.script?.destroy(GsplatRevealRadial.scriptName);
                        nextScene.script?.destroy(GsplatRevealRain.scriptName);
                        nextScene.script?.destroy(GsplatRevealGridEruption.scriptName);
                        // Scene is already disabled (was disabled at start of transition)
                        nextScene.renderOrder = 1; // Reset render order for future use
                    }
                    
                    // Ensure current active scene is properly set on top and enabled
                    if (currentActiveScene) {
                        currentActiveScene.renderOrder = 1;
                        // Scene should already be enabled from transition start
                        if (!currentActiveScene.enabled) {
                            currentActiveScene.enabled = true;
                        }
                    }
                    
                    // Update script references (for backward compatibility)
                    const currentEffect = data.get('effect') || 'radial';
                    if (currentEffect === 'radial') {
                        scene1Script = currentActiveScene.script?.get(GsplatRevealRadial.scriptName);
                    } else {
                        scene1Script = null;
                    }
                    scene2Script = null;
                    
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
        const BUILD_VERSION = 'v1.4.4';
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

        const boxEffect = getOrCreateBoxEffect(currentActiveScene);
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
    
    // Handle scene change to specific scene
    data.on('changeScene', (sceneId) => {
        if (typeof sceneId === 'string') {
            changeToScene(sceneId);
        }
    });
    
    // Initialize current scene ID and available scenes in observer
    data.set('currentSceneId', currentSceneId);
    data.set('availableScenes', availableScenes.map(s => ({ name: s.name, id: s.id })));

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
