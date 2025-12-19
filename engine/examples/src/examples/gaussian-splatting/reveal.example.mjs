// @config DESCRIPTION This example demonstrates reveal effects for gaussian splats.
import { data } from 'examples/observer';
import { deviceType, rootPath, fileImport } from 'examples/utils';
import * as pc from 'playcanvas';
import { AVAILABLE_SCENES, createSceneAssets, getScenesForObserver } from './scene-config.mjs';
import { loadSettings, saveSettings, initializeAutoSave, SETTINGS_KEYS } from './settings-manager.mjs';
import { applySettingsToRadialScript, createRadialScript, createRainScript, createGridScript, createEffect, getOrCreateBoxEffect } from './script-factory.mjs';

// Build version for tracking (must match version in reveal.controls.mjs)
const BUILD_VERSION = 'v1.4.9';

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

// Use scene configuration from module
const availableScenes = AVAILABLE_SCENES;

// Set available scenes in observer EARLY, before assets load
// This ensures controls can see all scenes immediately
const scenesForObserver = getScenesForObserver();
console.log(`[Build ${BUILD_VERSION}] Available scenes array (source):`, availableScenes);
console.log(`[Build ${BUILD_VERSION}] Scenes for observer (mapped):`, scenesForObserver);
console.log(`[Build ${BUILD_VERSION}] Setting available scenes EARLY, count:`, scenesForObserver.length, 'expected: 10');
data.set('availableScenes', scenesForObserver);
// Immediately verify
const verifyEarly = data.get('availableScenes');
console.log(`[Build ${BUILD_VERSION}] Verified EARLY scenes in observer:`, verifyEarly, 'count:', verifyEarly?.length);

// Create assets for all scenes using module function
const assets = createSceneAssets(rootPath);

const assetListLoader = new pc.AssetListLoader(Object.values(assets), app.assets);
assetListLoader.load(() => {
    app.start();

    // Load saved settings IMMEDIATELY (before creating script)
    // This ensures script is created with correct settings from the start

    // Array of available effects (extensible for future effects)
    const effects = ['radial', 'rain', 'grid'];

    // Default to radial effect
    data.set('effect', 'radial');

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
    
    // Keep reference to current scene for backward compatibility
    const hotel = scene1;

    // Helper vector for calculations
    const tmpVec3 = new pc.Vec3();

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

    // Get current active script
    const getActiveScript = () => {
        const currentEffect = data.get('effect');
        if (currentEffect === 'radial') {
            return currentActiveScene.script?.get(GsplatRevealRadial.scriptName);
        }
        // For other effects, get from current active scene
        return currentActiveScene.script?.get(GsplatRevealRain.scriptName) || currentActiveScene.script?.get(GsplatRevealGridEruption.scriptName);
    };

    // Sync observer settings to active script in real-time
    const syncSettingsToScript = () => {
        const currentEffect = data.get('effect');
        if (currentEffect === 'radial') {
            const script = currentActiveScene.script?.get(GsplatRevealRadial.scriptName);
            if (script) {
                applySettingsToRadialScript(data, script);
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
                const newScript = createRadialScript(data, currentActiveScene, GsplatRevealRadial, false);
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
        SETTINGS_KEYS.forEach(key => {
            data.on(`${key}:set`, () => {
                if (scriptReady) {
                    syncSettingsToScript();
                }
            });
        });
    }, 300);

    // Create only the radial script initially on scene1
    // If settings were loaded, they are already in observer, so script will use them
    scene1Script = createEffect(data, 'radial', scene1, GsplatRevealRadial, GsplatRevealRain, GsplatRevealGridEruption);
    
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
            applySettingsToRadialScript(data, scene1Script, true);
            
            // Verify it worked
            const newSpeed = scene1Script.speed;
            console.log('After re-apply, script speed:', newSpeed);
            
            // If still mismatched, recreate script (this ensures animation restarts with correct values)
            if (Math.abs(newSpeed - expectedSpeed) > 0.001) {
                console.warn('⚠️ Speed still mismatched after re-apply. Recreating script to restart animation...');
                scene1Script = createEffect(data, 'radial', scene1, GsplatRevealRadial, GsplatRevealRain, GsplatRevealGridEruption);
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
            applySettingsToRadialScript(data, scene1Script, true);
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
        createEffect(data, effect, currentActiveScene, GsplatRevealRadial, GsplatRevealRain, GsplatRevealGridEruption);
    });

    // Restart button - recreate current effect from beginning
    data.on('restart', () => {
        const currentEffect = data.get('effect');
        createEffect(data, currentEffect, currentActiveScene, GsplatRevealRadial, GsplatRevealRain, GsplatRevealGridEruption);
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
            if (currentReverseSpeed <= 0) {
                console.error('reverseSpeed must be > 0, got:', currentReverseSpeed);
                transitionStarted = false;
                return;
            }
            
            const reverseDuration = reverseDistance / currentReverseSpeed;
            
            // Ensure minimum duration to prevent issues
            const minDuration = 0.1;
            const safeReverseDuration = Math.max(minDuration, reverseDuration);

            // Calculate when to start next scene reveal based on overlap
            const nextSceneStartTime = safeReverseDuration * currentOverlap;

            // Start reverse reveal on current scene
            try {
                currentActiveScene.script?.destroy(GsplatRevealRadial.scriptName);
                const reverseScript = createRadialScript(data, currentActiveScene, GsplatRevealRadial, true, currentReverseSpeed);
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
                    forwardScript = createRadialScript(data, nextScene, GsplatRevealRadial, false, 1.0);
                } else if (currentEffect === 'rain') {
                    forwardScript = createRainScript(nextScene, GsplatRevealRain);
                } else if (currentEffect === 'grid') {
                    forwardScript = createGridScript(nextScene, GsplatRevealGridEruption);
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
        const BUILD_VERSION = 'v1.4.6';
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
    
    // Handle scene change to specific scene
    data.on('changeScene', (sceneId) => {
        if (typeof sceneId === 'string') {
            changeToScene(sceneId);
        }
    });
    
    // Initialize current scene ID (scenes already set earlier)
    console.log(`[Build ${BUILD_VERSION}] Available scenes array:`, availableScenes);
    console.log(`[Build ${BUILD_VERSION}] Re-setting available scenes in observer (after assets load):`, scenesForObserver);
    console.log(`[Build ${BUILD_VERSION}] Scenes count:`, scenesForObserver.length, 'expected: 7');
    data.set('currentSceneId', currentSceneId);
    // Re-set to ensure it's still correct after assets load
    data.set('availableScenes', scenesForObserver);
    // Verify it was set correctly
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
