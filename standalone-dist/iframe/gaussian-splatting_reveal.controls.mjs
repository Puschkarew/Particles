/**
 * Controls for Gaussian Splatting Reveal example using Lil GUI
 * @param {object} options - The options.
 * @param {import('@playcanvas/observer').Observer} options.observer - The observer instance.
 * @param {any} React - React library (optional, for Examples interface).
 * @param {any} jsx - JSX factory function (optional, for Examples interface).
 * @returns {JSX.Element|HTMLElement|Promise<HTMLElement>} The returned React component or DOM element.
 */
const controls = ({ observer, React, jsx }) => {
    // If React is available (Examples interface), return React component
    if (React && jsx) {
        const { useState, useEffect, useRef } = React;
        
        /**
         * React component that handles async loading of Lil GUI
         */
        const LilGUIContainer = () => {
            const [container, setContainer] = useState(null);
            const containerRef = useRef(null);
            
            useEffect(() => {
                if (containerRef.current && !container) {
                    loadLilGUI(observer).then(element => {
                        if (containerRef.current) {
                            containerRef.current.appendChild(element);
                            setContainer(element);
                        }
                    });
                }
            }, [observer]);
            
            return jsx('div', {
                ref: containerRef,
                id: 'controlPanel-controls',
                className: 'lilgui-controls compact'
            });
        };
        
        return jsx(LilGUIContainer);
    }
    
    // Standalone iframe mode: create DOM element directly
    const container = document.createElement('div');
    container.id = 'controlPanel-controls';
    container.className = 'lilgui-controls compact';
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.right = '10px';
    container.style.zIndex = '10000';
    container.style.maxHeight = '90vh';
    container.style.overflowY = 'auto';
    
    // Load and append controls
    loadLilGUI(observer).then(element => {
        container.appendChild(element);
    });
    
    // Append to body if not already in DOM
    if (!document.getElementById('controlPanel-controls')) {
        document.body.appendChild(container);
    }
    
    return container;
};

/**
 * Loads Lil GUI and creates controls
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance.
 * @returns {Promise<HTMLElement>} Promise that resolves to the controls container.
 */
function loadLilGUI(observer) {
    /**
     * @typedef {Window & typeof globalThis & { lil?: { GUI?: any }, GUI?: any }} LilWindow
     */
    const lilWindow = /** @type {LilWindow} */ (window);
    // Check if GUI is already loaded
    let GUI = lilWindow.lilGUI || (lilWindow.lil && lilWindow.lil.GUI) || lilWindow.GUI;
    if (GUI) {
        return Promise.resolve(createControls(observer, GUI));
    }
    
    // Load lil-gui from CDN using ESM version
    return new Promise((resolve) => {
        // Check if script is already being loaded
        const existingScript = document.querySelector('script[data-lil-gui]');
        if (existingScript) {
            const checkGUI = () => {
                GUI = lilWindow.lilGUI || (lilWindow.lil && lilWindow.lil.GUI) || lilWindow.GUI;
                if (GUI) {
                    const container = createControls(observer, GUI);
                    resolve(container);
                } else {
                    setTimeout(checkGUI, 50);
                }
            };
            checkGUI();
            return;
        }
        
        const script = document.createElement('script');
        // Use ESM version and import it
        script.type = 'module';
        script.textContent = `
            import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.21.0/+esm';
            window.lilGUI = GUI;
        `;
        script.setAttribute('data-lil-gui', 'true');
        // Wait for module to load and set window.lilGUI
        const checkGUI = () => {
            GUI = lilWindow.lilGUI || (lilWindow.lil && lilWindow.lil.GUI) || lilWindow.GUI;
            if (GUI) {
                const container = createControls(observer, GUI);
                resolve(container);
            } else {
                setTimeout(checkGUI, 100);
            }
        };
        setTimeout(checkGUI, 100);
        script.onerror = () => {
            const container = document.createElement('div');
            container.textContent = 'Failed to load Lil GUI from CDN';
            container.style.padding = '20px';
            container.style.color = 'red';
            resolve(container);
        };
        document.head.appendChild(script);
    });
}

/**
 * Creates the controls using Lil GUI
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance.
 * @param {any} GUI - The Lil GUI class.
 * @returns {HTMLElement} The returned DOM element container.
 */
function createControls(observer, GUI) {
    if (!GUI) {
        const container = document.createElement('div');
        container.textContent = 'Lil GUI not available';
        container.style.padding = '20px';
        container.style.color = 'red';
        return container;
    }
    
    // CRITICAL: Force hidden motion parameters to 0 FIRST, before any other initialization
    // This ensures they are always 0, even if loaded from localStorage or set elsewhere
    observer.set('dispersiveMotionSpeed', 0);
    observer.set('flagMotionSpeed', 0);
    observer.set('waveMotionSpeed', 0);
    
    // Initialize default values
    const currentSpeed = observer.get('speed');
    if (currentSpeed === undefined || currentSpeed === null) {
        observer.set('speed', 1.65);
    }
    if (observer.get('acceleration') === undefined) observer.set('acceleration', 0);
    if (observer.get('pointMotionSpeed') === undefined) observer.set('pointMotionSpeed', 1.5);
    if (observer.get('floatMotionSpeed') === undefined) observer.set('floatMotionSpeed', 1.5);
    
    // Hidden motion parameters - ALWAYS set to 0 when hidden (even if loaded from localStorage)
    // These parameters are not shown in UI and must be 0
    // Set again to ensure they are 0 after any potential loading from localStorage
    observer.set('dispersiveMotionSpeed', 0);
    observer.set('flagMotionSpeed', 0);
    observer.set('waveMotionSpeed', 0);
    if (observer.get('pointCloudScale') === undefined) observer.set('pointCloudScale', 0.5);
    if (observer.get('pointCloudDensity') === undefined) observer.set('pointCloudDensity', 0.65);
    if (observer.get('dotWaveThickness') === undefined) observer.set('dotWaveThickness', 1.0);
    if (observer.get('oceanWaveThickness') === undefined) observer.set('oceanWaveThickness', 0.33);
    if (observer.get('oceanWaveInterval') === undefined) observer.set('oceanWaveInterval', 10);
    if (observer.get('oceanWaveSpeedMultiplier') === undefined) observer.set('oceanWaveSpeedMultiplier', 4);
    if (observer.get('oceanWaveLiftScale') === undefined) observer.set('oceanWaveLiftScale', 0.6);
    if (observer.get('oceanWaveBrightness') === undefined) observer.set('oceanWaveBrightness', 1.0);
    if (observer.get('waveSpeed') === undefined) observer.set('waveSpeed', 1.0);
    // Store waveAmplitude * 10 in observer for UI (0-1 range), actual value is 0-0.1
    if (observer.get('waveAmplitude') === undefined) observer.set('waveAmplitude', 0.2);
    if (observer.get('distanceDarkening') === undefined) observer.set('distanceDarkening', 0.0);
    if (observer.get('baseBrightness') === undefined) observer.set('baseBrightness', 0.7);
    if (observer.get('delay') === undefined) observer.set('delay', 0);
    if (observer.get('oscillationIntensity') === undefined) observer.set('oscillationIntensity', 0.2);
    if (observer.get('endRadius') === undefined) observer.set('endRadius', 25);
    if (observer.get('revealStartRadius') === undefined) observer.set('revealStartRadius', 0.4);
    if (observer.get('pointCloudOpacity') === undefined) observer.set('pointCloudOpacity', 0.7);
    // Load Full Scene animation settings
    if (observer.get('loadFullSceneDuration') === undefined) observer.set('loadFullSceneDuration', 1.5);
    if (observer.get('loadFullSceneWaveThickness') === undefined) observer.set('loadFullSceneWaveThickness', 0.8);
    if (observer.get('loadFullSceneMotionFadeRange') === undefined) observer.set('loadFullSceneMotionFadeRange', 0.15);
    // Hide Scene animation settings
    if (observer.get('hideSceneDuration') === undefined) observer.set('hideSceneDuration', 2.0);
    if (observer.get('hideSceneMode') === undefined) observer.set('hideSceneMode', 0);
    if (observer.get('hideSceneLayerThickness') === undefined) observer.set('hideSceneLayerThickness', 0.1);
    const defaultDotHex = '#00ffff';
    if (!observer.get('dotTintHex')) observer.set('dotTintHex', defaultDotHex);

    // Create container for controls
    const container = document.createElement('div');
    container.id = 'controlPanel-controls';
    container.className = 'lilgui-controls';
    container.classList.add('compact');

    // Create GUI
    const gui = new GUI({
        container: container,
        title: '',
        width: 420
    });

    // Create parameters object that syncs with observer
    const params = {
        // Animation parameters
        speed: observer.get('speed') ?? 1.65,
        acceleration: observer.get('acceleration') ?? 0,
        pointMotionSpeed: observer.get('pointMotionSpeed') ?? 1.5,
        floatMotionSpeed: observer.get('floatMotionSpeed') ?? 1.5,
        // Hidden motion parameters - always 0 when hidden
        dispersiveMotionSpeed: 0,
        flagMotionSpeed: 0,
        waveMotionSpeed: 0,
        pointCloudScale: observer.get('pointCloudScale') ?? 0.5,
        pointCloudDensity: observer.get('pointCloudDensity') ?? 0.65,
        dotWaveThickness: observer.get('dotWaveThickness') ?? 1.0,
        oceanWaveThickness: observer.get('oceanWaveThickness') ?? 0.33,
        oceanWaveInterval: observer.get('oceanWaveInterval') ?? 10,
        oceanWaveSpeedMultiplier: observer.get('oceanWaveSpeedMultiplier') ?? 4,
        oceanWaveLiftScale: observer.get('oceanWaveLiftScale') ?? 0.6,
        oceanWaveBrightness: observer.get('oceanWaveBrightness') ?? 1.0,
        waveSpeed: observer.get('waveSpeed') ?? 1.0,
        // UI shows 0-1, but we store it as 0-1 (will be divided by 10 when applied)
        waveAmplitude: observer.get('waveAmplitude') ?? 0.2,
        distanceDarkening: observer.get('distanceDarkening') ?? 0.0,
        baseBrightness: observer.get('baseBrightness') ?? 0.7,
        // Hidden parameters (now exposed)
        delay: observer.get('delay') ?? 0,
        oscillationIntensity: observer.get('oscillationIntensity') ?? 0.2,
        endRadius: observer.get('endRadius') ?? 25,
        revealStartRadius: observer.get('revealStartRadius') ?? 0.4,
        pointCloudOpacity: observer.get('pointCloudOpacity') ?? 0.7,
        // Load Full Scene animation parameters
        loadFullSceneDuration: observer.get('loadFullSceneDuration') ?? 1.5,
        loadFullSceneWaveThickness: observer.get('loadFullSceneWaveThickness') ?? 0.8,
        loadFullSceneMotionFadeRange: observer.get('loadFullSceneMotionFadeRange') ?? 0.15,
        // Hide Scene animation parameters
        hideSceneDuration: observer.get('hideSceneDuration') ?? 2.0,
        hideSceneMode: observer.get('hideSceneMode') ?? 0,
        hideSceneLayerThickness: observer.get('hideSceneLayerThickness') ?? 0.1,
        // Color parameters
        dotTintHex: observer.get('dotTintHex') ?? defaultDotHex
    };

    // ==========================================
    // REVEAL - Main reveal animation parameters
    // ==========================================
    const revealFolder = gui.addFolder('Reveal');
    revealFolder.add(params, 'speed', 0, 3.3, 0.01).name('Speed').onChange(() => {
        observer.set('speed', params.speed);
    });
    revealFolder.add(params, 'acceleration', 0, 0.3, 0.001).name('Acceleration').onChange(() => {
        observer.set('acceleration', params.acceleration);
    });
    revealFolder.add(params, 'delay', 0, 10, 0.1).name('Delay').onChange(() => {
        observer.set('delay', params.delay);
    });
    revealFolder.add(params, 'dotWaveThickness', 0.1, 3.0, 0.01).name('Thickness').onChange(() => {
        observer.set('dotWaveThickness', params.dotWaveThickness);
    });

    // ==========================================
    // OCEAN WAVE - Ocean wave animation parameters
    // ==========================================
    const oceanWaveFolder = gui.addFolder('Ocean Wave');
    oceanWaveFolder.add(params, 'oceanWaveThickness', 0.05, 3.0, 0.01).name('Thickness').onChange(() => {
        observer.set('oceanWaveThickness', params.oceanWaveThickness);
    });
    oceanWaveFolder.add(params, 'oceanWaveInterval', 1, 60, 1).name('Interval').onChange(() => {
        observer.set('oceanWaveInterval', params.oceanWaveInterval);
    });
    oceanWaveFolder.add(params, 'oceanWaveSpeedMultiplier', 0.2, 8, 0.1).name('Speed Multiplier').onChange(() => {
        observer.set('oceanWaveSpeedMultiplier', params.oceanWaveSpeedMultiplier);
    });
    oceanWaveFolder.add(params, 'oceanWaveLiftScale', 0, 1, 0.01).name('Lift Strength').onChange(() => {
        observer.set('oceanWaveLiftScale', params.oceanWaveLiftScale);
    });
    oceanWaveFolder.add(params, 'oceanWaveBrightness', 0.5, 4.0, 0.01).name('Brightness').onChange(() => {
        observer.set('oceanWaveBrightness', params.oceanWaveBrightness);
    });
    
    // Advanced reveal radius controls - hidden from UI but values are preserved
    // oscillationIntensity, revealStartRadius, and endRadius are initialized but not shown in GUI

    // ==========================================
    // MOTION - All point movement parameters
    // ==========================================
    const motionFolder = gui.addFolder('Motion');
    motionFolder.add(params, 'floatMotionSpeed', 0, 3, 0.01).name('Float Speed').onChange(() => {
        observer.set('floatMotionSpeed', params.floatMotionSpeed);
    });
    motionFolder.add(params, 'waveSpeed', 0, 5, 0.01).name('Wave Speed').onChange(() => {
        observer.set('waveSpeed', params.waveSpeed);
    });
    motionFolder.add(params, 'waveAmplitude', 0, 1, 0.01).name('Wave Amplitude').onChange(() => {
        observer.set('waveAmplitude', params.waveAmplitude);
    });
    
    // Hidden motion parameters - values are preserved but not shown in UI
    // flagMotionSpeed, waveMotionSpeed, dispersiveMotionSpeed are initialized but not exposed

    // ==========================================
    // APPEARANCE - All visual appearance parameters
    // ==========================================
    const appearanceFolder = gui.addFolder('Appearance');
    appearanceFolder.add(params, 'pointCloudScale', 0.1, 2.0, 0.01).name('Point Size').onChange(() => {
        observer.set('pointCloudScale', params.pointCloudScale);
    });
    appearanceFolder.add(params, 'pointCloudDensity', 0.1, 1.0, 0.01).name('Cloud Density').onChange(() => {
        observer.set('pointCloudDensity', params.pointCloudDensity);
    });
    appearanceFolder.add(params, 'pointCloudOpacity', 0, 1, 0.01).name('Cloud Opacity').onChange(() => {
        observer.set('pointCloudOpacity', params.pointCloudOpacity);
    });
    appearanceFolder.add(params, 'baseBrightness', 0, 1, 0.01).name('Base Brightness').onChange(() => {
        observer.set('baseBrightness', params.baseBrightness);
    });
    appearanceFolder.add(params, 'distanceDarkening', 0, 5, 0.01).name('Distance Darkening').onChange(() => {
        observer.set('distanceDarkening', params.distanceDarkening);
    });
    const dotColorController = appearanceFolder.addColor(params, 'dotTintHex').name('Dot Colour');
    dotColorController.onChange(() => {
        observer.set('dotTintHex', params.dotTintHex);
    });

    // ==========================================
    // SCENE - Scene management and transitions
    // ==========================================
    const sceneFolder = gui.addFolder('Scene');
    
    // Get available scenes from observer (set by example)
    const availableScenes = observer.get('availableScenes') || [
        { name: 'Future', id: 'future' },
        { name: 'Ceramic', id: 'ceramic' },
        { name: 'Room', id: 'room' }
    ];
    
    // Create scene names array for dropdown
    const sceneNames = availableScenes.map(s => s.name);
    const sceneIds = availableScenes.map(s => s.id);
    
    // Get current scene ID from observer
    const currentSceneId = observer.get('currentSceneId') || 'future';
    const currentSceneIndex = sceneIds.indexOf(currentSceneId);
    const currentSceneName = currentSceneIndex >= 0 ? sceneNames[currentSceneIndex] : sceneNames[0];
    
    // Create params object for scene selection
    const sceneParams = {
        currentScene: currentSceneName
    };
    
    // Create dropdown for scene selection
    const sceneController = sceneFolder.add(sceneParams, 'currentScene', sceneNames)
        .name('Scene')
        .onChange((value) => {
            const selectedIndex = sceneNames.indexOf(value);
            if (selectedIndex >= 0) {
                const selectedSceneId = sceneIds[selectedIndex];
                observer.emit('changeScene', selectedSceneId);
            }
        });
    
    // Update dropdown when scene changes externally
    observer.on('sceneChanged', (sceneId) => {
        const sceneIndex = sceneIds.indexOf(sceneId);
        if (sceneIndex >= 0 && sceneParams.currentScene !== sceneNames[sceneIndex]) {
            sceneParams.currentScene = sceneNames[sceneIndex];
            sceneController.updateDisplay();
        }
    });
    
    // Add "Load Full Scene" button
    const sceneActions = {
        loadFullScene: () => {
            observer.emit('loadFullScene');
        },
        hideScene: () => {
            observer.emit('hideScene');
        }
    };
    sceneFolder.add(sceneActions, 'loadFullScene').name('Load Full Scene');
    sceneFolder.add(sceneActions, 'hideScene').name('Hide Scene');
    
    // Add Load Full Scene animation settings
    sceneFolder.add(params, 'loadFullSceneDuration', 0.1, 10.0, 0.1).name('Load Duration').onChange(() => {
        observer.set('loadFullSceneDuration', params.loadFullSceneDuration);
    });
    sceneFolder.add(params, 'loadFullSceneWaveThickness', 0.1, 3.0, 0.01).name('Wave Thickness').onChange(() => {
        observer.set('loadFullSceneWaveThickness', params.loadFullSceneWaveThickness);
    });
    sceneFolder.add(params, 'loadFullSceneMotionFadeRange', 0.01, 0.5, 0.01).name('Motion Fade Range').onChange(() => {
        observer.set('loadFullSceneMotionFadeRange', params.loadFullSceneMotionFadeRange);
    });
    
    // Add Hide Scene animation settings
    sceneFolder.add(params, 'hideSceneDuration', 0.1, 10.0, 0.1).name('Hide Duration').onChange(() => {
        observer.set('hideSceneDuration', params.hideSceneDuration);
    });
    sceneFolder.add(params, 'hideSceneMode', 0, 2, 1).name('Hide Mode').onChange(() => {
        observer.set('hideSceneMode', params.hideSceneMode);
    });
    sceneFolder.add(params, 'hideSceneLayerThickness', 0.01, 1.0, 0.01).name('Layer Thickness').onChange(() => {
        observer.set('hideSceneLayerThickness', params.hideSceneLayerThickness);
    });
    
    // Add build version display
    const BUILD_VERSION = 'v1.4.4';
    const buildInfo = {
        version: BUILD_VERSION
    };
    sceneFolder.add(buildInfo, 'version')
        .name('Build Version')
        .disable(); // Make it read-only

    // ==========================================
    // CAMERA - Camera controls
    // ==========================================
    const cameraFolder = gui.addFolder('Camera');
    let cameraPaused = true; // Camera paused by default
    const cameraActions = {
        togglePause: () => {
            cameraPaused = !cameraPaused;
            observer.emit('cameraPause', cameraPaused);
        }
    };
    const cameraPauseButton = cameraFolder.add(cameraActions, 'togglePause').name('Resume Movement');
    
    // Emit initial pause state to sync with example
    observer.emit('cameraPause', true);
    
    // Update button text based on pause state
    const updatePauseButton = (paused) => {
        cameraPaused = paused;
        if (cameraPauseButton) {
            cameraPauseButton.name(paused ? 'Resume Movement' : 'Pause Movement');
        }
    };
    
    // Listen for external pause state changes
    observer.on('cameraPause', (paused) => {
        updatePauseButton(paused);
    });

    // Open folders by default
    revealFolder.open();
    oceanWaveFolder.open();
    motionFolder.open();
    appearanceFolder.open();
    sceneFolder.open();
    cameraFolder.open();

    // Listen to observer changes to update GUI
    /**
     * @param {keyof typeof params} key
     * @param {unknown} value
     */
    const updateFromObserver = (key, value) => {
        if (Object.prototype.hasOwnProperty.call(params, key) && params[key] !== value) {
            params[key] = value;
            gui.updateDisplay();
        }
    };

    // Subscribe to observer changes
    // Note: oscillationIntensity, endRadius, revealStartRadius are not in this list
    // as they are hidden from UI, but their values are still initialized and used
    const keys = /** @type {(keyof typeof params)[]} */ ([
        'speed',
        'acceleration',
        'delay',
        'pointMotionSpeed',
        'floatMotionSpeed',
        'pointCloudScale',
        'pointCloudDensity',
        'pointCloudOpacity',
        'dotWaveThickness',
        'oceanWaveThickness',
        'oceanWaveInterval',
        'oceanWaveSpeedMultiplier',
        'oceanWaveLiftScale',
        'oceanWaveBrightness',
        'waveSpeed',
        'waveAmplitude',
        'distanceDarkening',
        'baseBrightness',
        'dotTintHex',
        'loadFullSceneDuration',
        'loadFullSceneWaveThickness',
        'loadFullSceneMotionFadeRange'
    ]);
    
    keys.forEach(key => {
        observer.on(`${key}:set`, (value) => {
            updateFromObserver(key, value);
        });
    });

    return container;
}

export { controls };
